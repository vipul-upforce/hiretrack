/* eslint-disable max-lines */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Dispatch, AnyAction } from '@reduxjs/toolkit';
import { Candidate } from '@/types/candidate';
import { CustomFields } from '@/Custom_Fields/Types/CustomField';
import logger from '@/lib/logger';
import { refreshAccessToken } from '@/lib/api/baseApi';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { getDecodedSSE } from './useSSE';

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
  onTabCountUpdate?: (count: number) => void;
  onCustomFieldsUpdate?: (customFields: CustomFields) => void;
};

/**
 * WebSocket-based connection manager for real-time notifications
 * Replaces SSE to eliminate HTTP/1.1 6-connection limit
 */
class SSEManager {
  private socket: WebSocket | null = null;

  private subscribers: Map<string, Subscriber> = new Map();

  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempts: number | null = null;

  private isConnecting = false;

  private isRefreshingToken = false;

  private dispatch?: Dispatch<AnyAction>;

  setDispatch(dispatch: Dispatch<AnyAction>) {
    this.dispatch = dispatch;
  }

  subscribe(subscriber: Subscriber, enabled: boolean = true): () => void {
    this.subscribers.set(subscriber.id, subscriber);

    // If no connection exists and we're not already connecting, create one
    // Only connect if enabled is true
    if (enabled && !this.socket && !this.isConnecting) {
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

  private async handleUnauthorizedError(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshingToken) return false;
    this.isRefreshingToken = true;
    try {
      // Attempt to refresh the token
      await refreshAccessToken(this.dispatch);
      logger.log('WebSocket: Token refreshed successfully, reconnecting...');
      this.isRefreshingToken = false;
      return true;
    } catch (error) {
      logger.error('WebSocket: Failed to refresh token:', error);
      this.isRefreshingToken = false;
      return false;
    }
  }

  private connect() {
    if (this.isConnecting || this.socket) return;

    this.isConnecting = true;

    // Build WebSocket URL
    // In development with separate WS server, connect to port 3001
    // In production (or combined mode), connect to same host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT;
    const host = wsPort
      ? `${window.location.hostname}:${wsPort}`
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      this.broadcastConnectionChange(true);
      logger.log('WebSocket: Connected to', wsUrl);
    };

    this.socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle auth_error events from WebSocket server
        if (data?.type === 'auth_error') {
          logger.log(
            'WebSocket: Received auth_error, attempting token refresh...',
          );
          const refreshSuccess = await this.handleUnauthorizedError();
          if (refreshSuccess) {
            // Close current connection and reconnect
            if (this.socket) {
              this.socket.close();
              this.socket = null;
            }
            this.isConnecting = false;
            // Reconnect after token refresh
            if (this.subscribers.size > 0 && !this.reconnectTimeout) {
              this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connect();
              }, 500);
            }
          } else {
            // Refresh failed, close connection
            if (this.socket) {
              this.socket.close();
              this.socket = null;
            }
            this.isConnecting = false;
          }
          return;
        }

        await this.handleMessage(data);
      } catch (e) {
        logger.log('WebSocket: Unexpected error:', e);
      }
    };

    this.socket.onerror = (error) => {
      logger.error('WebSocket: Connection error:', error);
    };

    this.socket.onclose = async (event) => {
      this.broadcastConnectionChange(false);
      this.socket = null;
      this.isConnecting = false;

      // Code 1008 means policy violation (auth error)
      if (event.code === 1008) {
        // Attempt to refresh token and reconnect
        const refreshSuccess = await this.handleUnauthorizedError();
        if (
          refreshSuccess &&
          this.subscribers.size > 0 &&
          !this.reconnectTimeout
        ) {
          // Wait a bit longer after token refresh to ensure cookies are set
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 500);
          return;
        }
      }

      // Reconnect if we still have subscribers (for non-auth errors or if refresh failed)
      if (!this.reconnectAttempts) this.reconnectAttempts = 0;
      if (
        this.subscribers.size > 0 &&
        !this.reconnectTimeout &&
        this.reconnectAttempts < 50
      ) {
        // Exponential backoff for reconnection (max 30 seconds)
        const delay = Math.min(1000 * 1.5 ** this.reconnectAttempts, 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.reconnectAttempts! += 1;
          this.connect();
        }, delay);
      }
    };
  }

  private async handleMessage(data: {
    type?: string;
    count?: number;
    notification?: string;
    notifications?: unknown[];
    candidate?: unknown;
    candidates?: unknown;
    lanes?: string[];
    jobId?: string;
    laneRenamed?: boolean;
    clients?: number;
    activeTabs?: number;
    error?: string;
    customFields?: unknown;
  }) {
    if (
      (data?.type === 'connectionStatus' || data?.type === 'connected') &&
      typeof data.activeTabs === 'number'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onTabCountUpdate?.(data.activeTabs as number);
      });
    }

    if (
      data?.type === 'notificationCountUpdated' &&
      typeof data.count === 'number'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onNotificationCountUpdated?.(data.count as number);
      });
    }

    if (
      data?.type === 'notification' &&
      typeof data.notification === 'string'
    ) {
      this.subscribers.forEach((sub) => {
        sub.onNotification?.(data.notification as string);
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

    if (data.type === 'candidateUpdate' && data.candidate) {
      const encodedCandidate = data.candidate;
      if (typeof encodedCandidate === 'string') {
        const updatedCandidate = await getDecodedSSE(encodedCandidate);
        if (updatedCandidate && updatedCandidate._id) {
          this.subscribers.forEach((sub) => {
            sub.onCandidateUpdate?.(updatedCandidate);
          });
        }
      }
    }

    if (data.type === 'multipleCandidateUpdate' && data.candidates) {
      if (typeof data.candidates === 'string') {
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
    }

    if (data.type === 'lanesUpdate' && Array.isArray(data.lanes)) {
      this.subscribers.forEach((sub) => {
        sub.onLanesUpdate?.(
          data.lanes as string[],
          data.jobId as string,
          data.laneRenamed as boolean,
        );
      });
    }

    if (data.type === 'clients' && typeof data.clients === 'number') {
      this.subscribers.forEach((sub) => {
        sub.onClientsUpdate?.(data.clients as number);
      });
    }

    if (data.type === 'customFieldsUpdate' && data.customFields) {
      const encodedCustomFields = data.customFields;
      if (typeof encodedCustomFields === 'string') {
        const decodedCustomFields = await getDecodedSSE(encodedCustomFields);
        if (
          decodedCustomFields &&
          typeof decodedCustomFields === 'object' &&
          !Array.isArray(decodedCustomFields)
        ) {
          // Check if it's an error object (has success: false or error property)
          const hasError =
            'success' in decodedCustomFields &&
            (decodedCustomFields as { success?: boolean }).success === false;
          const hasErrorProperty = 'error' in decodedCustomFields;

          if (hasError || hasErrorProperty) {
            logger.error(
              'Invalid custom fields data received from SSE (error object):',
              decodedCustomFields,
            );
            return;
          }

          this.subscribers.forEach((sub) => {
            sub.onCustomFieldsUpdate?.(decodedCustomFields as CustomFields);
          });
        } else {
          logger.error(
            'Invalid custom fields data structure received from SSE',
          );
        }
      }
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
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.isConnecting = false;
  }

  getConnectionState(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

const sseManager = new SSEManager();

// Export sseManager for conditional subscription in other components
export { sseManager };

export function useNotificationSSE(
  initialUnreadCount: number = 0,
  initialTotalCount: number = 0,
) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth || {});
  const isCandidate = user?.role === 'candidate';
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lanes, setLanes] = useState<string[]>();
  const [jobId, setJobId] = useState<string | null>(null);
  const [laneRenamed, setLaneRenamed] = useState<boolean>(false);
  const [clients, setClients] = useState<number>();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [activeTabCount, setActiveTabCount] = useState<number>(1);
  const [customFields, setCustomFields] = useState<CustomFields | null>(null);
  const subscriberIdRef = useRef<string>(
    `subscriber-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  );

  const handleTabCountUpdate = useCallback((count: number) => {
    setActiveTabCount(count);
  }, []);

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

  const handleCustomFieldsUpdate = useCallback(
    (updatedCustomFields: CustomFields) => {
      setCustomFields(updatedCustomFields);
    },
    [],
  );

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    setTotalCount(initialTotalCount);
    setNotification(null);
    setNotifications([]);
  }, [initialUnreadCount, initialTotalCount]);

  useEffect(() => {
    // Prevent candidates from subscribing to notification SSE
    if (isCandidate) {
      setIsConnected(false);
      return undefined;
    }

    // Set dispatch for token refresh
    sseManager.setDispatch(dispatch);

    // Subscribe to the shared WebSocket connection (only if not a candidate)
    const unsubscribe = sseManager.subscribe(
      {
        id: subscriberIdRef.current,
        onNotificationCountUpdated: handleNotificationCountUpdated,
        onNotification: handleNotification,
        onNotifications: handleNotifications,
        onCandidateUpdate: handleCandidateUpdate,
        onMultipleCandidateUpdate: handleMultipleCandidateUpdate,
        onLanesUpdate: handleLanesUpdate,
        onClientsUpdate: handleClientsUpdate,
        onConnectionChange: handleConnectionChange,
        onTabCountUpdate: handleTabCountUpdate,
        onCustomFieldsUpdate: handleCustomFieldsUpdate,
      },
      !isCandidate, // enabled = false for candidates
    );

    // Set initial connection state
    setIsConnected(sseManager.getConnectionState());
    return unsubscribe;
  }, [
    dispatch,
    isCandidate,
    handleNotificationCountUpdated,
    handleNotification,
    handleNotifications,
    handleCandidateUpdate,
    handleMultipleCandidateUpdate,
    handleLanesUpdate,
    handleClientsUpdate,
    handleConnectionChange,
    handleTabCountUpdate,
    handleCustomFieldsUpdate,
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
    activeTabCount,
    customFields,
  };
}
