const LOCK_KEY = 'hiretrack:auth:refresh-lock';
const LOCK_TTL_MS = 30_000;
const CHANNEL_NAME = 'hiretrack-auth-refresh';

type RefreshLockPayload = {
  tabId: string;
  startedAt: number;
};

type RefreshBroadcastMessage = {
  type: 'refresh-complete';
  result: 'success' | 'failure';
  tabId: string;
};

let cachedTabId: string | null = null;

function getTabId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  if (cachedTabId) {
    return cachedTabId;
  }

  const stored = sessionStorage.getItem('hiretrack:tab-id');
  if (stored) {
    cachedTabId = stored;
    return stored;
  }

  const nextId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('hiretrack:tab-id', nextId);
  cachedTabId = nextId;
  return nextId;
}

function readLock(): RefreshLockPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RefreshLockPayload;
    if (Date.now() - parsed.startedAt > LOCK_TTL_MS) {
      localStorage.removeItem(LOCK_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(LOCK_KEY);
    return null;
  }
}

/** True when another browser tab holds an active refresh lock. */
export function isAnotherTabRefreshing(): boolean {
  const lock = readLock();
  return lock !== null && lock.tabId !== getTabId();
}

/** Attempt to become the cross-tab refresh leader. */
export function acquireRefreshLock(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const existing = readLock();
  if (existing && existing.tabId !== getTabId()) {
    return false;
  }

  localStorage.setItem(
    LOCK_KEY,
    JSON.stringify({ tabId: getTabId(), startedAt: Date.now() } satisfies RefreshLockPayload),
  );

  return readLock()?.tabId === getTabId();
}

export function releaseRefreshLock(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const lock = readLock();
  if (lock?.tabId === getTabId()) {
    localStorage.removeItem(LOCK_KEY);
  }
}

export function broadcastRefreshResult(result: 'success' | 'failure'): void {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);
  const message: RefreshBroadcastMessage = {
    type: 'refresh-complete',
    result,
    tabId: getTabId(),
  };
  channel.postMessage(message);
  channel.close();
}

/**
 * Wait until another tab finishes token refresh (or lock expires).
 * Returns `success` when the leader completed refresh, `failure` on explicit failure,
 * or `timeout` when no signal arrives in time.
 */
export function waitForCrossTabRefresh(
  timeoutMs: number = LOCK_TTL_MS,
): Promise<'success' | 'failure' | 'timeout'> {
  if (typeof window === 'undefined') {
    return Promise.resolve('timeout');
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: 'success' | 'failure' | 'timeout') => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = window.setTimeout(() => finish('timeout'), timeoutMs);

    const onLockReleased = () => {
      if (!isAnotherTabRefreshing()) {
        window.clearTimeout(timer);
        finish('success');
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<RefreshBroadcastMessage>) => {
        const data = event.data;
        if (
          data?.type === 'refresh-complete' &&
          data.tabId !== getTabId()
        ) {
          window.clearTimeout(timer);
          channel.close();
          finish(data.result === 'success' ? 'success' : 'failure');
        }
      };
    }

    const poll = () => {
      if (settled) return;
      onLockReleased();
      if (!settled) {
        window.setTimeout(poll, 150);
      }
    };

    poll();
  });
}
