import { useEffect, useRef, useState, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import logger from '@/lib/logger';
import { getDecodedSSE } from './useSSE';

type Subscriber = {
  id: string;
  onNotificationCountUpdated?: (count: number) => void;
  onNotification?: (notification: string) => void;
  onNotifications?: (notifications: string[]) => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  onMultipleCandidateUpdate?: (candidates: Candidate[]) => void;
  onLanesUpdate?: (lanes: string[], jobId: string) => void;
  onClientsUpdate?: (clients: number) => void;
  onConnectionChange?: (connected: boolean) => void;
};

class SSEManager {
  private eventSource: EventSource | null = null;

  private subscribers: Map<string, Subscriber> = new Map();

  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private isConnecting = false;

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);

    // If no connection exists and we're not already connecting, create one
    if (!this.eventSource && !this.isConnecting) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber.id);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  private connect() {
    if (this.isConnecting || this.eventSource) return;

    this.isConnecting = true;
    this.eventSource = new EventSource('/api/sse/notifications');

    this.eventSource.onopen = () => {
      this.isConnecting = false;
      this.broadcastConnectionChange(true);
    };

    this.eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        await this.handleMessage(data);
      } catch (e) {
        logger.log('UPEXPECTED ERROR : ', e);
      }
    };

    this.eventSource.onerror = () => {
      this.broadcastConnectionChange(false);
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.isConnecting = false;

      if (this.subscribers.size > 0 && !this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, 100);
      }
    };
  }

  private async handleMessage(data: unknown) {
    type EventData =
      | { type: 'notificationCountUpdated'; count: number }
      | { type: 'notification'; notification: string }
      | { type: 'notifications'; notifications: string[] }
      | { type: 'candidateUpdate'; candidate: unknown }
      | { type: 'multipleCandidateUpdate'; candidates: unknown }
      | { type: 'lanesUpdate'; lanes: string[]; jobId: string }
      | { type: 'clients'; clients: number }
      | Record<string, unknown>;

    const typed = data as EventData;

    if (
      typed.type === 'notificationCountUpdated' &&
      typeof typed.count === 'number'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onNotificationCountUpdated?.(typed.count as number);
      });
      return;
    }

    if (
      typed.type === 'notification' &&
      typeof typed.notification === 'string'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onNotification?.(typed.notification as string);
      });
      return;
    }

    if (typed.type === 'notifications' && Array.isArray(typed.notifications)) {
      const tokens: string[] = typed.notifications.filter(
        (t: unknown) => typeof t === 'string',
      );
      if (tokens.length) {
        this.subscribers.forEach((sub) => {
          sub.onNotifications?.(tokens);
        });
      }
      return;
    }

    if (typed.type === 'candidateUpdate') {
      const encodedCandidate = typed.candidate;
      const updatedCandidate = await getDecodedSSE(encodedCandidate as string);
      if (updatedCandidate && updatedCandidate._id) {
        this.subscribers.forEach((sub) => {
          sub.onCandidateUpdate?.(updatedCandidate);
        });
      }
      return;
    }

    if (typed.type === 'multipleCandidateUpdate') {
      const decodedCandidates = await getDecodedSSE(typed.candidates as string);
      if (decodedCandidates) {
        const updatedCandidates = Object.values(
          decodedCandidates,
        ) as Candidate[];
        this.subscribers.forEach((sub) => {
          sub.onMultipleCandidateUpdate?.(updatedCandidates);
        });
      }
      return;
    }

    if (
      typed.type === 'lanesUpdate' &&
      Array.isArray(typed.lanes) &&
      typeof typed.jobId === 'string'
    ) {
      const lanes = typed.lanes as string[];
      const jobId = typed.jobId as string;
      this.subscribers.forEach((sub) => {
        sub.onLanesUpdate?.(lanes, jobId);
      });
      return;
    }

    if (typed.type === 'clients' && typeof typed.clients === 'number') {
      this.subscribers.forEach((sub) => {
        sub.onClientsUpdate?.(typed.clients as number);
      });
    }
  }

  private broadcastConnectionChange(connected: boolean) {
    this.subscribers.forEach((sub) => {
      sub.onConnectionChange?.(connected);
    });
  }

  private disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  getConnectionState(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Singleton instance
const sseManager = new SSEManager();

/**
 * Main notification SSE hook.
 * Returns jobId along with lanes so consuming hooks/components can determine scoping.
 *
 * @param initialUnreadCount - Initial unread notification count.
 * @param initialTotalCount - Initial total notification count.
 */
export function useNotificationSSE(
  initialUnreadCount: number = 0,
  initialTotalCount: number = 0,
) {
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lanes, setLanes] = useState<string[] | undefined>(undefined);
  const [lanesJobId, setLanesJobId] = useState<string | null>(null);
  const [clients, setClients] = useState<number>();
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const subscriberIdRef = useRef<string>(
    `subscriber-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  );

  // Callbacks for SSE events
  const handleNotificationCountUpdated = useCallback((count: number) => {
    setTotalCount((c) => c + 1);
    setUnreadCount(count);
  }, []);

  const handleNotification = useCallback((notificationStr: string) => {
    setNotification(notificationStr);
    setNotifications((prev) => [notificationStr, ...prev]);
  }, []);

  const handleNotifications = useCallback((notificationTokens: string[]) => {
    setTotalCount((c) => c + notificationTokens.length);
    setNotifications((prev) => [...notificationTokens, ...prev]);
  }, []);

  const handleCandidateUpdate = useCallback((updatedCandidate: Candidate) => {
    setCandidates((prev) => {
      const index = prev.findIndex((c) => c._id === updatedCandidate._id);
      if (index >= 0) {
        return [
          ...prev.slice(0, index),
          updatedCandidate,
          ...prev.slice(index + 1),
        ];
      }
      return [...prev, updatedCandidate];
    });
  }, []);

  const handleMultipleCandidateUpdate = useCallback(
    (updatedCandidates: Candidate[]) => {
      setCandidates((prev: Candidate[]) => {
        const updatedIds = new Set(
          updatedCandidates.map((c: Candidate) => c._id),
        );
        const filtered = prev.filter((c) => !updatedIds.has(c._id));
        return [...filtered, ...updatedCandidates];
      });
    },
    [],
  );

  // This now gets both lanes and the jobId (from the SSE payload)
  const handleLanesUpdate = useCallback(
    (lanesData: string[], jobId: string) => {
      setLanes(lanesData);
      setLanesJobId(jobId);
    },
    [],
  );

  const handleClientsUpdate = useCallback((clientsCount: number) => {
    setClients(clientsCount);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    setTotalCount(initialTotalCount);
    setNotification(null);
    setNotifications([]);
  }, [initialUnreadCount, initialTotalCount]);

  useEffect(() => {
    // Subscribe to the shared SSE connection
    const unsubscribe = sseManager.subscribe({
      id: subscriberIdRef.current,
      onNotificationCountUpdated: handleNotificationCountUpdated,
      onNotification: handleNotification,
      onNotifications: handleNotifications,
      onCandidateUpdate: handleCandidateUpdate,
      onMultipleCandidateUpdate: handleMultipleCandidateUpdate,
      onLanesUpdate: handleLanesUpdate,
      onClientsUpdate: handleClientsUpdate,
      onConnectionChange: handleConnectionChange,
    });

    // Set initial connection state
    setIsConnected(sseManager.getConnectionState());

    return unsubscribe;
  }, [
    handleNotificationCountUpdated,
    handleNotification,
    handleNotifications,
    handleCandidateUpdate,
    handleMultipleCandidateUpdate,
    handleLanesUpdate,
    handleClientsUpdate,
    handleConnectionChange,
  ]);

  return {
    unreadCount,
    totalCount,
    notification,
    notifications,
    candidates,
    setCandidates,
    lanes,
    clients,
    isConnected,
    jobId: lanesJobId,
  };
}
