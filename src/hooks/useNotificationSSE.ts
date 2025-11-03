import { useEffect, useRef, useState } from "react";

export function useNotificationSSE(
  initialUnreadCount: number = 0,
  initialTotalCount: number = 0
) {
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    // Close existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/sse/notifications`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // unread count from server
        if (
          data?.type === "notificationCountUpdated" &&
          typeof data.count === "number"
        ) {
          setTotalCount((c) => c + 1);
          setUnreadCount(data.count);
        }

        // new single notification
        if (data?.type === "notification") {
          // setTotalCount((c) => c + 1);
          if (typeof data.notification === "string") {
            setNotification(data.notification);
            setNotifications((prev) => [data.notification, ...prev]);
            console.log(
              "New notification received via SSE:",
              data.notification
            );
          }
        }

        // bulk notifications
        if (
          data?.type === "notifications" &&
          Array.isArray(data.notifications)
        ) {
          setTotalCount((c) => c + data.notifications.length);
          // store raw tokens for future use without surfacing in UI
          const tokens: string[] = data.notifications.filter(
            (t: unknown) => typeof t === "string"
          );
          if (tokens.length) {
            setNotifications((prev) => [...tokens, ...prev]);
          }
        }
      } catch (e) {
        console.log("UPEXPECTED ERROR : ", e);
      }
    };

    es.onerror = () => {
      // Close broken stream
      es.close();

      // Reconnect immediately
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 100); // small delay prevents tight loop if server down
      }
    };
  };

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    setTotalCount(initialTotalCount);
    setNotification(null);
    setNotifications([]);
  }, [initialUnreadCount, initialTotalCount]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { unreadCount, totalCount, notification, notifications };
}
