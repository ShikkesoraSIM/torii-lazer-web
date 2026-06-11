import { useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../utils/api';
import { apiCache } from '../utils/apiCache';
import { useWebSocketNotifications } from './useWebSocketNotifications';
import type { UnreadCount, APINotification, User } from '../types';

export const useNotifications = (isAuthenticated: boolean, currentUser?: User | null) => {
  const [unreadCount, setUnreadCount] = useState<UnreadCount>({
    total: 0,
    team_requests: 0,
    private_messages: 0,
    friend_requests: 0,
  });
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle a new notification
  const handleNewNotification = useCallback((notification: APINotification) => {
    // Ignore the notification if it's our own message
    if (notification.source_user_id && currentUser && notification.source_user_id === currentUser.id) {
      return;
    }

    // Pre-fetch user info so the UI can show the correct username
    if (notification.source_user_id && !apiCache.hasCachedUser(notification.source_user_id)) {
      apiCache.getUser(notification.source_user_id).catch(error => {
        console.error('Failed to pre-fetch user info:', error);
      });
    }

    setNotifications(prev => {
      // Dedup based on object_id, object_type, name and source_user_id
      const isDuplicate = prev.some(n => {
        // Exact ID match
        if (n.id === notification.id) return true;

        // Same notification type with the same object and sender
        if (n.object_id === notification.object_id &&
            n.object_type === notification.object_type &&
            n.name === notification.name &&
            n.source_user_id === notification.source_user_id) {
          return true;
        }

        return false;
      });

      if (isDuplicate) {
        return prev;
      }

      return [notification, ...prev];
    });

    // Update the unread count
    setUnreadCount(prev => {
      const newCount = { ...prev };

      // Increment the relevant counter based on notification type
      switch (notification.name) {
        case 'team_application_store':
        case 'team_application_accept':
        case 'team_application_reject':
          newCount.team_requests++;
          break;
        case 'channel_message':
          newCount.private_messages++;
          break;
        default:
          break;
      }
      
      newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
      return newCount;
    });
  }, [currentUser]);

  // Open the WebSocket connection
  const { isConnected, connectionError } = useWebSocketNotifications({
    isAuthenticated,
    currentUser,
    onNewNotification: handleNewNotification,
  });

  // Fetch the initial notification data
  const fetchNotifications = useCallback(async (force: boolean = false) => {
    if (!isAuthenticated) {
      setUnreadCount({
        total: 0,
        team_requests: 0,
        private_messages: 0,
        friend_requests: 0,
      });
      setNotifications([]);
      return;
    }

    // Skip if not forcing a refresh and we already have data
    if (!force && notifications.length > 0) {
      return;
    }

    try {
      setIsLoading(true);

      // Fetch notifications via the grouped/deduped API
      const response = await notificationsAPI.getGroupedNotifications();

      setNotifications(response.notifications || []);

      // Pre-fetch user info for every notification
      const userIdsToFetch = new Set<number>();
      (response.notifications || []).forEach((notification: APINotification) => {
        if (notification.source_user_id && !apiCache.hasCachedUser(notification.source_user_id)) {
          userIdsToFetch.add(notification.source_user_id);
        }
      });

      if (userIdsToFetch.size > 0) {
        apiCache.getUsers(Array.from(userIdsToFetch)).catch(error => {
          console.error('Failed to batch-fetch notification user info:', error);
        });
      }

      // Compute the unread counts
      const teamRequestCount = response.notifications.filter((n: APINotification) =>
        ['team_application_store', 'team_application_accept', 'team_application_reject'].includes(n.name) && !n.is_read
      ).length;

      const privateMessageCount = response.notifications.filter((n: APINotification) =>
        n.name === 'channel_message' && !n.is_read
      ).length;

      const friendRequestCount = 0; // no friend requests for now

      setUnreadCount({
        team_requests: teamRequestCount,
        private_messages: privateMessageCount,
        friend_requests: friendRequestCount,
        total: teamRequestCount + privateMessageCount + friendRequestCount,
      });

    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true); // force-refresh the initial data
    }
  }, [isAuthenticated]);

  // Periodic refresh (while the WebSocket is disconnected)
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      const interval = setInterval(() => fetchNotifications(true), 60000); // 60s to reduce frequency
      return () => clearInterval(interval);
    }
  }, [isConnected, isAuthenticated]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchNotifications(true);
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      // Find the notification to mark
      const targetNotification = notifications.find(n => n.id === notificationId);
      if (!targetNotification) {
        return;
      }

      if (targetNotification.is_read) {
        return;
      }

      // Call the API to mark it read
      await notificationsAPI.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      // Update the unread count (using the notification we already found)
      setUnreadCount(prev => {
        const newCount = { ...prev };

        switch (targetNotification.name) {
          case 'team_application_store':
          case 'team_application_accept':
          case 'team_application_reject':
            newCount.team_requests = Math.max(0, newCount.team_requests - 1);
            break;
          case 'channel_message':
            newCount.private_messages = Math.max(0, newCount.private_messages - 1);
            break;
        }

        newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
        return newCount;
      });

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [notifications]);

  // Decrease the unread count (when the user views a notification)
  const decrementCount = useCallback((type?: keyof Omit<UnreadCount, 'total'>, amount: number = 1) => {
    setUnreadCount(prev => {
      const newCount = { ...prev };

      if (type && newCount[type] > 0) {
        newCount[type] = Math.max(0, newCount[type] - amount);
      }

      // Recompute the total
      newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;

      return newCount;
    });
  }, []);

  // Remove a notification
  const removeNotification = useCallback((notificationId: number) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        // If removing an unread notification, update the unread count
        setUnreadCount(prevCount => {
          const newCount = { ...prevCount };
          
          switch (notification.name) {
            case 'team_application_store':
            case 'team_application_accept':
            case 'team_application_reject':
              newCount.team_requests = Math.max(0, newCount.team_requests - 1);
              break;
            case 'channel_message':
              newCount.private_messages = Math.max(0, newCount.private_messages - 1);
              break;
          }
          
          newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
          return newCount;
        });
      }
      
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Remove notifications matching a given object_id and object_type
  const removeNotificationByObject = useCallback(async (objectId: string, objectType: string) => {
    try {
      // Find the matching notifications
      const notificationsToRemove = notifications.filter(n =>
        n.object_id === objectId && n.object_type === objectType
      );

      if (notificationsToRemove.length === 0) {
        return;
      }

      // Mark them read via the batch API. Only pass object_id; passing object_type
      // would fail because the backend expects an int there.
      await notificationsAPI.markMultipleAsRead([
        {
          object_id: parseInt(objectId),
        }
      ]);

      // Update local state
      setNotifications(prev => {
        const unreadNotificationsToRemove = notificationsToRemove.filter(n => !n.is_read);

        if (unreadNotificationsToRemove.length > 0) {
          setUnreadCount(prevCount => {
            const newCount = { ...prevCount };

            unreadNotificationsToRemove.forEach(notification => {
              switch (notification.name) {
                case 'team_application_store':
                case 'team_application_accept':
                case 'team_application_reject':
                  newCount.team_requests = Math.max(0, newCount.team_requests - 1);
                  break;
                case 'channel_message':
                  newCount.private_messages = Math.max(0, newCount.private_messages - 1);
                  break;
              }
            });

            newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
            return newCount;
          });
        }

        // Mark the matching notifications as read instead of deleting them
        const updatedNotifications = prev.map(n =>
          (n.object_id === objectId && n.object_type === objectType)
            ? { ...n, is_read: true }
            : n
        );

        return updatedNotifications;
      });
    } catch (error) {
      console.error('Failed to batch-mark notifications as read:', error);
    }
  }, [notifications]);

  return {
    unreadCount,
    notifications,
    isLoading,
    isConnected,
    connectionError,
    refresh,
    decrementCount,
    markAsRead,
    removeNotification,
    removeNotificationByObject,
  };
};
