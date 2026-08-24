/* eslint-disable max-lines */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import { CustomFields } from '@/Custom_Fields/Types/CustomField';
import logger from '@/lib/logger';
// import { refreshAccessToken } from '@/lib/api/baseApi';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  filterSensitiveRedFlagsForInterviewer,
  filterSensitiveRedFlagsForInterviewerList,
} from '@/lib/filterSensitiveRedFlags';
import { isActorDeletedCandidateId } from '@/lib/sseActorDelete';
import { getDecodedSSE } from './useSSE';

function getCandidateLaneStatusLabel(candidate: Candidate): string {
  const status = candidate.status;
  if (!status) return 'applied';
  if (typeof status === 'string') return status.toLowerCase();
  if (typeof status === 'object' && status !== null && 'name' in status) {
    const name = (status as { name?: string }).name;
    if (typeof name === 'string' && name.trim()) return name.toLowerCase();
  }
  return String(status).toLowerCase();
}

// Singleton SSE connection manager
type Subscriber = {
  id: string;
  onNotificationCountUpdated?: (count: number) => void;
  onNotification?: (notification: string) => void;
  onNotifications?: (notifications: string[]) => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  onCandidateRemoved?: (candidate: Candidate) => void;
  onMultipleCandidateUpdate?: (candidates: Candidate[]) => void;
  onLanesUpdate?: (
    lanes: string[],
    jobIdData: string,
    laneRenamedData: boolean,
  ) => void;
  onClientsUpdate?: (clients: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onCustomFieldsUpdate?: (customFields: CustomFields) => void;
};

/**
 * WebSocket-based connection manager for real-time notifications
 * Replaces SSE to eliminate HTTP/1.1 6-connection limit
 */
class SSEManager {
  private socket: WebSocket | null = null;

  private subscribers: Map<string, Subscriber> = new Map();

  // Dedupe candidateUpdate messages (server or reconnect can emit duplicates).
  // Keyed by candidateId + prevStatus + status + updatedAt + deleted.
  // TTL is short so legitimate consecutive updates still pass through.
  private recentCandidateUpdateKeys: Map<string, number> = new Map();

  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempts: number | null = null;

  private isConnecting = false;

  // private isRefreshingToken = false;
  // private dispatch?: Dispatch<AnyAction>;
  // setDispatch(dispatch: Dispatch<AnyAction>) {
  //   this.dispatch = dispatch;
  // }

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

  // private async handleUnauthorizedError(): Promise<boolean> {
  //   if (this.isRefreshingToken) return false;
  //   this.isRefreshingToken = true;
  //   try {
  //     await refreshAccessToken(this.dispatch);
  //     logger.log('WebSocket: Token refreshed successfully, reconnecting...');
  //     this.isRefreshingToken = false;
  //     return true;
  //   } catch (error) {
  //     logger.error('WebSocket: Failed to refresh token:', error);
  //     this.isRefreshingToken = false;
  //     return false;
  //   }
  // }

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

        // Handle auth_error events from WebSocket server (refresh logic commented out)
        if (data?.type === 'auth_error') {
          logger.log('WebSocket: Received auth_error, closing connection.');
          // await this.handleUnauthorizedError();
          // if (refreshSuccess) { ... reconnect ... } else { ... close ... }
          if (this.socket) {
            this.socket.close();
            this.socket = null;
          }
          this.isConnecting = false;
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

    this.socket.onclose = async (_event) => {
      this.broadcastConnectionChange(false);
      this.socket = null;
      this.isConnecting = false;

      // Code 1008 means policy violation (auth error) - refresh logic commented out
      // if (event.code === 1008) {
      //   const refreshSuccess = await this.handleUnauthorizedError();
      //   if (refreshSuccess && this.subscribers.size > 0 && !this.reconnectTimeout) {
      //     this.reconnectTimeout = setTimeout(() => {
      //       this.reconnectTimeout = null;
      //       this.connect();
      //     }, 500);
      //     return;
      //   }
      // }

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
    deleted?: boolean;
    previousStatus?: string;
    previousIsDeleted?: boolean;
    previousJobId?: string;
    lanes?: string[];
    jobId?: string;
    laneRenamed?: boolean;
    clients?: number;
    activeTabs?: number;
    error?: string;
    customFields?: unknown;
  }) {
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
          const {
            deleted = false,
            previousStatus,
            previousIsDeleted,
            previousJobId,
          } = data;
          const subscriberCount = this.subscribers.size;

          // Normalize _id to string so create and evaluate merge by same id on Client B (JWT may decode _id as object)
          const idStr =
            typeof updatedCandidate._id === 'string'
              ? updatedCandidate._id
              : String(updatedCandidate._id);

          // Some code paths (e.g. bulk move job) embed the previous job id into the candidate payload itself.
          // Don't overwrite that embedded value with undefined from the wrapper payload.
          const embeddedPreviousJobId = (
            updatedCandidate as { previousJobIdFromSSE?: unknown }
          )?.previousJobIdFromSSE;
          const previousJobIdEffective =
            previousJobId ??
            (embeddedPreviousJobId != null
              ? String(embeddedPreviousJobId)
              : undefined);

          // Dedupe identical candidateUpdate events within a small TTL.
          const updatedAt =
            (updatedCandidate as { tracking?: { updatedAt?: string } })
              ?.tracking?.updatedAt ?? '';
          const statusStr = String(
            (updatedCandidate as { status?: unknown })?.status ?? '',
          );
          const dedupeKey = [
            idStr,
            String(previousStatus ?? ''),
            statusStr,
            String(previousJobIdEffective ?? ''),
            updatedAt,
            String(deleted),
          ].join('|');
          const now = Date.now();
          const ttlMs = 2000;
          const lastSeenAt = this.recentCandidateUpdateKeys.get(dedupeKey);
          if (lastSeenAt && now - lastSeenAt < ttlMs) {
            logger.info('[SSE_UI] SSE candidateUpdate deduped', {
              candidateId: idStr,
              previousStatus,
              status: statusStr,
              updatedAt,
              deleted,
              subscriberCount,
            });
            return;
          }
          this.recentCandidateUpdateKeys.set(dedupeKey, now);
          // Periodically prune map (cheap).
          if (this.recentCandidateUpdateKeys.size > 200) {
            for (const [k, ts] of this.recentCandidateUpdateKeys.entries()) {
              if (now - ts > ttlMs) this.recentCandidateUpdateKeys.delete(k);
            }
          }

          // Attach previousStatus to candidate object for use in delta computation
          const candidateWithPreviousStatus = previousStatus
            ? ({
                ...updatedCandidate,
                _id: idStr,
                previousStatusFromSSE: previousStatus,
                previousIsDeletedFromSSE: previousIsDeleted,
                previousJobIdFromSSE:
                  previousJobIdEffective ??
                  (updatedCandidate as { previousJobIdFromSSE?: string })
                    ?.previousJobIdFromSSE,
              } as Candidate & {
                previousStatusFromSSE?: string;
                previousIsDeletedFromSSE?: boolean;
                previousJobIdFromSSE?: string;
              })
            : ({
                ...updatedCandidate,
                _id: idStr,
                previousIsDeletedFromSSE: previousIsDeleted,
                previousJobIdFromSSE:
                  previousJobIdEffective ??
                  (updatedCandidate as { previousJobIdFromSSE?: string })
                    ?.previousJobIdFromSSE,
              } as Candidate & {
                previousIsDeletedFromSSE?: boolean;
                previousJobIdFromSSE?: string;
              });

          logger.info('[SSE_UI] SSE received candidateUpdate', {
            candidateId: idStr,
            deleted,
            status: (updatedCandidate as { status?: string }).status,
            previousStatus,
            jobId: (updatedCandidate as { jobId?: unknown }).jobId,
            previousJobId: previousJobIdEffective,
            subscriberCount,
          });
          this.subscribers.forEach((sub) => {
            if (deleted === true) {
              const candidateWithPreviousStatusForDelete = previousStatus
                ? ({
                    ...updatedCandidate,
                    _id: idStr,
                    previousStatusFromSSE: previousStatus,
                  } as Candidate & {
                    previousStatusFromSSE?: string;
                  })
                : { ...updatedCandidate, _id: idStr };
              sub.onCandidateRemoved?.(candidateWithPreviousStatusForDelete);
            } else {
              sub.onCandidateUpdate?.(candidateWithPreviousStatus);
            }
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
  const userRole = user?.role;
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
  const [customFields, setCustomFields] = useState<CustomFields | null>(null);
  const [removedCandidates, setRemovedCandidates] = useState<
    Array<{ id: string; status: string; candidate?: Candidate }>
  >([]);
  const subscriberIdRef = useRef<string>(
    `subscriber-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  );

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

  const handleCandidateUpdate = useCallback(
    (updatedCandidate: Candidate) => {
      console.log('Received candidate update via SSE:', updatedCandidate);
      const roleFilteredCandidate =
        filterSensitiveRedFlagsForInterviewer<Candidate>(
          updatedCandidate,
          userRole,
        );

      setCandidates((prev) => {
        const index = prev.findIndex(
          (c) => c._id === roleFilteredCandidate._id,
        );
        const getStatusName = (
          candidate: Candidate | null | undefined,
        ): string | undefined => {
          if (!candidate) return undefined;
          const rawStatus = candidate.status;
          if (typeof rawStatus === 'string' && rawStatus.trim()) {
            return rawStatus.toLowerCase();
          }
          if (
            rawStatus &&
            typeof rawStatus === 'object' &&
            'name' in (rawStatus as { name?: unknown })
          ) {
            const nameValue = (rawStatus as { name?: unknown }).name;
            if (typeof nameValue === 'string' && nameValue.trim()) {
              return nameValue.toLowerCase();
            }
          }
          return undefined;
        };

        const incomingPreviousStatus = (
          roleFilteredCandidate as { previousStatusFromSSE?: string }
        ).previousStatusFromSSE;
        const existingPreviousStatus = getStatusName(prev[index]);
        const candidateWithDerivedPreviousStatus =
          !incomingPreviousStatus && existingPreviousStatus
            ? ({
                ...roleFilteredCandidate,
                previousStatusFromSSE: existingPreviousStatus,
              } as Candidate)
            : roleFilteredCandidate;

        if (index >= 0) {
          // Merge incoming partial update with existing candidate data
          // CRITICAL: Preserve duplicateCount if the incoming update has it as 0/undefined
          // but the existing data has a value > 0.
          const mergedCandidate = {
            ...prev[index],
            ...candidateWithDerivedPreviousStatus,
            duplicateCount:
              candidateWithDerivedPreviousStatus.duplicateCount ||
              prev[index].duplicateCount ||
              0,
          };
          
          return [
            ...prev.slice(0, index),
            mergedCandidate,
            ...prev.slice(index + 1),
          ];
        }
        return [...prev, candidateWithDerivedPreviousStatus];
      });
    },
    [userRole],
  );

  const handleCandidateRemoved = useCallback((candidate: Candidate) => {
    // Actor client: remove from global list so card can disappear; still add to removedCandidates so
    // useNormalizedCandidates can remove from map + markMovedOut (card disappears). Delta -1 is skipped for actor (refetch provides count).
    // if (isActorDeletedCandidateId(candidate._id)) {
    // setCandidates((prev) => prev.filter((c) => c._id !== candidate._id));
    // Fall through to add to removedCandidates so Client A's lane removes the card via markMovedOut (no -1 delta in useNormalizedCandidates).
    // }

    // Use previousStatusFromSSE from SSE payload (most reliable) or fallback to parsing candidate.status
    const previousStatusFromSSE = (
      candidate as { previousStatusFromSSE?: string }
    )?.previousStatusFromSSE?.toLowerCase();
    let status: string;

    if (previousStatusFromSSE) {
      // Use previousStatus from SSE payload (most reliable - sent by backend)
      status = previousStatusFromSSE;
    } else {
      // Fallback: try to extract from candidate.status (may be ObjectId)
      const rawStatus =
        typeof candidate.status === 'string' ? candidate.status : 'applied';
      // Backend may send status as ObjectId (e.g. populated ref); normalize to lane name so lane deltas apply
      status =
        /^[a-f0-9]{24}$/i.test(rawStatus) ||
        rawStatus.length > 20 ||
        !/^[a-z]+$/i.test(rawStatus)
          ? 'applied'
          : rawStatus.toLowerCase();
    }

    // Dedupe: same SSE event can be received twice (reconnect, or broadcast to multiple subscribers);
    // only add once per candidate id so lane count delta is -1 not -2
    setRemovedCandidates((prev) =>
      prev.some((r) => r.id === candidate._id)
        ? prev
        : [...prev, { id: candidate._id, status, candidate }],
    );
    // For non-actor only: also remove from global list (actor already filtered above)
    // if (!isActorDeletedCandidateId(candidate._id)) {
    setCandidates((prev) => prev.filter((c) => c._id !== candidate._id));
    // }
  }, []);

  const handleMultipleCandidateUpdate = useCallback(
    (updatedCandidates: Candidate[]) => {
      const roleFilteredCandidates =
        filterSensitiveRedFlagsForInterviewerList<Candidate>(
          updatedCandidates,
          userRole,
        );

      setCandidates((prev: Candidate[]) => {
        const updatedCandidatesMap = new Map(
          roleFilteredCandidates.map((c: Candidate) => [c._id, c]),
        );

        // Map over previous candidates and merge if updated, or keep as is
        const updated = prev.map((existing) => {
          const update = updatedCandidatesMap.get(existing._id);
          if (update) {
            const prevStatus = getCandidateLaneStatusLabel(existing);
            const nextStatus = getCandidateLaneStatusLabel(update);
            const merged = {
              ...existing,
              ...update,
              duplicateCount:
                update.duplicateCount || existing.duplicateCount || 0,
              ...(prevStatus !== nextStatus
                ? { previousStatusFromSSE: prevStatus }
                : {}),
            } as Candidate & { previousStatusFromSSE?: string };
            updatedCandidatesMap.delete(existing._id);
            return merged;
          }
          return existing;
        });

        const newCandidates = Array.from(updatedCandidatesMap.values()).map(
          (candidate) => candidate as Candidate & { previousStatusFromSSE?: string },
        );

        return [...updated, ...newCandidates];
      });
    },
    [userRole],
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

    // Set dispatch for token refresh (commented out)
    // sseManager.setDispatch(dispatch);

    // Subscribe to the shared WebSocket connection (only if not a candidate)
    const unsubscribe = sseManager.subscribe(
      {
        id: subscriberIdRef.current,
        onNotificationCountUpdated: handleNotificationCountUpdated,
        onNotification: handleNotification,
        onNotifications: handleNotifications,
        onCandidateUpdate: handleCandidateUpdate,
        onCandidateRemoved: handleCandidateRemoved,
        onMultipleCandidateUpdate: handleMultipleCandidateUpdate,
        onLanesUpdate: handleLanesUpdate,
        onClientsUpdate: handleClientsUpdate,
        onConnectionChange: handleConnectionChange,
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
    handleCandidateRemoved,
    handleMultipleCandidateUpdate,
    handleLanesUpdate,
    handleClientsUpdate,
    handleConnectionChange,
    handleCustomFieldsUpdate,
  ]);

  return {
    unreadCount,
    totalCount,
    notification,
    notifications,
    candidates,
    setCandidates,
    removedCandidates,
    lanes,
    clients,
    isConnected,
    jobId,
    laneRenamed,
    customFields,
  };
}
