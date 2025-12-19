import { useEffect, useRef, useState, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import logger from '@/lib/logger';
import { getDecodedSSE } from './useSSE';

// Singleton SSE connection manager
// Singleton SSE connection manager
type Subscriber = {
  id: string;
  onNotificationCountUpdated?: (count: number) => void;
  onNotification?: (notification: string) => void;
  onNotifications?: (notifications: string[]) => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  onMultipleCandidateUpdate?: (candidates: Candidate[]) => void;
  onLanesUpdate?: (
    lanes: string[],
    jobIdData: string,
    laneRenamedData: boolean,
  ) => void;
  onClientsUpdate?: (clients: number) => void;
  onConnectionChange?: (connected: boolean) => void;
};

class SSEManager {
  private eventSource: EventSource | null = null;

  private subscribers: Map<string, Subscriber> = new Map();

  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempts: number | null = null;

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
      // If no more subscribers, close the connection
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

      // Reconnect if we still have subscribers
      if (!this.reconnectAttempts) this.reconnectAttempts = 0;
      if (
        this.subscribers.size > 0 &&
        !this.reconnectTimeout &&
        this.reconnectAttempts < 50
      ) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.reconnectAttempts! += 1;
          this.connect();
        }, 1000);
      }
      // If successful connection occurs, elsewhere in `onopen` remember to reset `this.reconnectAttempts = 0`
    };
  }

  private async handleMessage(data: any) {
    if (
      data?.type === 'notificationCountUpdated' &&
      typeof data.count === 'number'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onNotificationCountUpdated?.(data.count);
      });
    }

    if (
      data?.type === 'notification' &&
      typeof data.notification === 'string'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onNotification?.(data.notification);
      });
    }

    if (data?.type === 'notifications' && Array.isArray(data.notifications)) {
      const tokens: string[] = data.notifications.filter(
        (t: unknown) => typeof t === 'string',
      );
      if (tokens.length) {
        this.subscribers.forEach((sub) => {
          sub.onNotifications?.(tokens);
        });
      }
    }

    if (data.type === 'candidateUpdate') {
      const encodedCandidate = data.candidate;
      const updatedCandidate = await getDecodedSSE(encodedCandidate);
      if (updatedCandidate && updatedCandidate._id) {
        this.subscribers.forEach((sub) => {
          sub.onCandidateUpdate?.(updatedCandidate);
        });
      }
    }

    if (data.type === 'multipleCandidateUpdate') {
      const decodedCandidates = await getDecodedSSE(data.candidates);
      if (decodedCandidates) {
        const updatedCandidates = Object.values(
          decodedCandidates,
        ) as Candidate[];
        this.subscribers.forEach((sub) => {
          sub.onMultipleCandidateUpdate?.(updatedCandidates);
        });
      }
    }

    if (data.type === 'lanesUpdate') {
      this.subscribers.forEach((sub) => {
        sub.onLanesUpdate?.(data.lanes, data.jobId, data.laneRenamed);
      });
    }

    if (data.type === 'clients') {
      this.subscribers.forEach((sub) => {
        sub.onClientsUpdate?.(data.clients);
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

export function useNotificationSSE(
  initialUnreadCount: number = 0,
  initialTotalCount: number = 0,
) {
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  // Candidate update state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lanes, setLanes] = useState<string[]>();
  const [jobId, setJobId] = useState<string | null>(null);
  const [laneRenamed, setLaneRenamed] = useState<boolean>(false);
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

  const handleLanesUpdate = useCallback(
    (lanesData: string[], jobIdData: string, laneRenamedData: boolean) => {
      setLanes(lanesData);
      setJobId(jobIdData);
      setLaneRenamed(laneRenamedData);
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
    jobId,
    laneRenamed,
  };
}
