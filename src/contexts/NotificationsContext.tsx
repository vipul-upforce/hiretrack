'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { INotification } from '@/lib/models/notification';

interface NotificationsContextType {
  notifications: INotification[];
  isLoading: boolean;
  refetch: () => void;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export function NotificationsProvider({
  children,
  notifications,
  isLoading,
  refetch,
}: {
  children: ReactNode;
  notifications: INotification[];
  isLoading: boolean;
  refetch: () => void;
}) {
  return (
    <NotificationsContext.Provider
      value={useMemo(
        () => ({ notifications, isLoading, refetch }),
        [notifications, isLoading, refetch],
      )}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      'useNotificationsContext must be used within a NotificationsProvider',
    );
  }
  return context;
}
