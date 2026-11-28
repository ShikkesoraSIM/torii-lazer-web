import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { APINotification, UnreadCount, User } from '../types';

interface NotificationContextValue {
  unreadCount: UnreadCount;
  notifications: APINotification[];
  isLoading: boolean;
  isConnected: boolean;
  chatConnected: boolean; // chat connection status
  connectionError: string | null;
  markAsRead: (id: number) => Promise<void> | void;
  removeNotification: (id: number) => void;
  removeNotificationByObject: (objectId: string, objectType: string) => Promise<void> | void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ isAuthenticated: boolean; user?: User | null; children: ReactNode; }> = ({
  isAuthenticated,
  user,
  children,
}) => {
  const {
    unreadCount,
    notifications,
    isLoading,
    isConnected,
    connectionError,
    markAsRead,
    removeNotification,
    removeNotificationByObject,
    refresh,
  } = useNotifications(isAuthenticated, user);

  const chatConnected = isConnected;

  const value = useMemo<NotificationContextValue>(() => ({
    unreadCount,
    notifications,
    isLoading,
    isConnected,
    chatConnected,
    connectionError,
    markAsRead,
    removeNotification,
    removeNotificationByObject,
    refresh,
  }), [unreadCount, notifications, isLoading, isConnected, chatConnected, connectionError, markAsRead, removeNotification, removeNotificationByObject, refresh]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return ctx;
};
