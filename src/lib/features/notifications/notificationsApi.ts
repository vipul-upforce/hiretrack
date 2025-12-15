import { baseApi } from '@/lib/api/baseApi';
import { INotification } from '@/lib/models/notification';

interface NotificationsResponse {
  notifications: INotification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface NotificationCountResponse {
  unreadCount: number;
  totalCount: number;
}

interface GetNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  priority?: string;
}

interface MarkAsReadResponse {
  message: string;
  notification: INotification;
}

interface MarkAllAsReadResponse {
  message: string;
  modifiedCount: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, GetNotificationsParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.isRead !== undefined) searchParams.append('isRead', params.isRead.toString());
        if (params.type) searchParams.append('type', params.type);
        if (params.priority) searchParams.append('priority', params.priority);

        return `/notifications?${searchParams.toString()}`;
      },
      providesTags: (result, error, params) => [
        { type: 'Notification', id: 'LIST' },
        ...(result?.notifications || []).map((notification) => ({
          type: 'Notification' as const,
          id: notification._id,
        })),
      ],
    }),

    getNotificationCount: builder.query<NotificationCountResponse, void>({
      query: () => '/notifications/count',
      providesTags: [{ type: 'NotificationCount', id: 'COUNT' }],
    }),

    markNotificationAsRead: builder.mutation<MarkAsReadResponse, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'NotificationCount', id: 'COUNT' },
      ],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Update the notification in the cache optimistically
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData(
            'getNotifications',
            {},
            (draft) => {
              const notification = draft.notifications.find((n) => n._id === id);
              if (notification) {
                notification.isRead = true;
              }
            },
          ),
        );

        // Update the count optimistically
        const countPatchResult = dispatch(
          notificationsApi.util.updateQueryData(
            'getNotificationCount',
            undefined,
            (draft) => {
              if (draft.unreadCount > 0) {
                draft.unreadCount -= 1;
              }
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert the optimistic update if the mutation fails
          patchResult.undo();
          countPatchResult.undo();
        }
      },
    }),

    markAllNotificationsAsRead: builder.mutation<MarkAllAsReadResponse, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PUT',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'NotificationCount', id: 'COUNT' },
      ],
      // Optimistic update
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        // Update all notifications in the cache optimistically
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData(
            'getNotifications',
            {},
            (draft) => {
              draft.notifications.forEach((notification) => {
                notification.isRead = true;
              });
            },
          ),
        );

        // Update the count optimistically
        const countPatchResult = dispatch(
          notificationsApi.util.updateQueryData(
            'getNotificationCount',
            undefined,
            (draft) => {
              draft.unreadCount = 0;
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert the optimistic updates if the mutation fails
          patchResult.undo();
          countPatchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = notificationsApi;
