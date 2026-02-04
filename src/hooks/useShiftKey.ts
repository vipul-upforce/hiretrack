import { useSyncExternalStore } from 'react';

// --- Global shift key store: one listener, many readers ---
let isShiftPressed = false;
const listeners = new Set<() => void>();

function getSnapshot(): boolean {
  return isShiftPressed;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Shift' || isShiftPressed) return;
  isShiftPressed = true;
  listeners.forEach((l) => l());
}

/**
 * Globally available shift key state. One window listener is used no matter
 * how many components call this hook. Use anywhere to read isShiftPressed.
 */

// --- Range anchor: initial click (laneId + index) for shift-select ---
export interface ShiftRangeAnchor {
  laneId: string;
  startIndex: number;
}

let rangeAnchor: ShiftRangeAnchor | null = null;
const anchorListeners = new Set<() => void>();

function getAnchorSnapshot(): ShiftRangeAnchor | null {
  return rangeAnchor;
}

function subscribeAnchor(listener: () => void): () => void {
  anchorListeners.add(listener);
  return () => {
    anchorListeners.delete(listener);
  };
}

function notifyAnchorListeners() {
  anchorListeners.forEach((l) => l());
}

export function setShiftRangeAnchor(laneId: string, startIndex: number): void {
  rangeAnchor = { laneId, startIndex };
  notifyAnchorListeners();
}

export function clearShiftRangeAnchor(): void {
  if (rangeAnchor === null) return;
  rangeAnchor = null;
  notifyAnchorListeners();
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key !== 'Shift' || !isShiftPressed) return;
  isShiftPressed = false;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  };
}
export function useShiftKey(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
/**
 * Hook to read and update the shift-range anchor (first click in a lane).
 * Use with useShiftKey(): on first shift+click call setAnchor(laneId, index);
 * on second shift+click you have anchor.startIndex and current index → select [start, end].
 * Anchor is not cleared on Shift release so the next shift+click continues from the last selected.
 */
export function useShiftRangeAnchor(): [
  ShiftRangeAnchor | null,
  (laneId: string, startIndex: number) => void,
  () => void,
] {
  const anchor = useSyncExternalStore(
    subscribeAnchor,
    getAnchorSnapshot,
    getAnchorSnapshot,
  );
  return [anchor, setShiftRangeAnchor, clearShiftRangeAnchor];
}
