import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationsAPI } from '../utils/api';
import type { 
  SocketMessage, 
  ChatEvent, 
  NotificationEvent, 
  APINotification,
  ChatMessage,
  User
} from '../types';
import { showCustomToast } from '../components/CustomToast';

// Generate a unique notification ID
let notificationIdCounter = 0;
const generateUniqueNotificationId = (): number => {
  return Date.now() * 10000 + (++notificationIdCounter % 10000);
};

interface UseWebSocketNotificationsProps {
  isAuthenticated: boolean;
  currentUser?: User | null;
  onNewMessage?: (message: ChatMessage) => void;
  onNewNotification?: (notification: APINotification) => void;
}

let globalWsRef: WebSocket | null = null; // shared connection
let globalConnecting = false; // connecting flag
let globalIsConnected = false; // global connection state
let globalConnectionError: string | null = null; // global connection error
const globalMessageListeners = new Set<(m: ChatMessage) => void>();
const globalNotificationListeners = new Set<(n: APINotification) => void>();
const globalConnectionStateListeners = new Set<(connected: boolean, error: string | null) => void>(); // connection-state listeners
let globalEndpointCache: string | null = null; // endpoint cache

// Dispatch functions
const dispatchChatMessage = (msg: ChatMessage) => {
  if (globalMessageListeners.size === 0) {
    messageBuffer.push(msg);
    return;
  }
  globalMessageListeners.forEach(fn => { try { fn(msg); } catch (e) { console.error('Failed to dispatch chat message to listener', e); } });
};
const dispatchNotification = (n: APINotification) => {
  if (globalNotificationListeners.size === 0) {
    notificationBuffer.push(n);
    return;
  }
  globalNotificationListeners.forEach(fn => { try { fn(n); } catch (e) { console.error('Failed to dispatch notification to listener', e); } });
};
const dispatchConnectionState = (connected: boolean, error: string | null) => {
  globalIsConnected = connected;
  globalConnectionError = error;
  globalConnectionStateListeners.forEach(fn => { try { fn(connected, error); } catch (e) { console.error('Failed to dispatch connection state to listener', e); } });
};

// Buffer queues (hold items until listeners are mounted)
const messageBuffer: ChatMessage[] = [];
const notificationBuffer: APINotification[] = [];

export const useWebSocketNotifications = ({
  isAuthenticated,
  currentUser,
  onNewMessage,
  onNewNotification
}: UseWebSocketNotificationsProps) => {
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [connectionError, setConnectionError] = useState<string | null>(globalConnectionError);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayBase = 1000;
  const endpointCacheRef = useRef<string | null>(null);
  const lastConnectAttemptRef = useRef<number>(0);
  const connectionThrottleMs = 2000; // don't reconnect within 2s

  // Get the WebSocket endpoint (cached)
  const getWebSocketEndpoint = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) {
      endpointCacheRef.current = null;
      globalEndpointCache = null;
      return null;
    }
    // Prefer the global cache
    if (globalEndpointCache) return globalEndpointCache;
    if (endpointCacheRef.current) return endpointCacheRef.current;
    try {
      const response = await notificationsAPI.getNotifications();
      endpointCacheRef.current = response.notification_endpoint;
      globalEndpointCache = endpointCacheRef.current;
      return endpointCacheRef.current;
    } catch (error) {
      console.error('Failed to get notification endpoint:', error);
      return null;
    }
  }, [isAuthenticated]);

  // Send a message over the WebSocket
  const sendMessage = useCallback((message: SocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Handle an incoming WebSocket message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: SocketMessage = JSON.parse(event.data);

  // Handle the various chat-message events
      if (message.event === 'chat.message.new' ||
          message.event === 'new_message' ||
          message.event === 'message') {
        const chatEvent = message as ChatEvent;

        if (chatEvent.data?.messages) {
          chatEvent.data.messages.forEach(msg => {
            // Filter out our own messages
            if (msg.sender_id && currentUser && msg.sender_id === currentUser.id) {
              return;
            }
            dispatchChatMessage(msg);
          });
        } else if ((chatEvent.data as any)?.message) {
          // May be a single message instead of an array
          const msg = (chatEvent.data as any).message as ChatMessage;
          // Filter out our own messages
          if (msg.sender_id && currentUser && msg.sender_id === currentUser.id) {
            return;
          }
          dispatchChatMessage(msg);
        } else if (chatEvent.data && typeof chatEvent.data === 'object') {
          // The message data may be directly in `data`
          const msg = chatEvent.data as ChatMessage;
          // Filter out our own messages
          if (msg.sender_id && currentUser && msg.sender_id === currentUser.id) {
            return;
          }
          dispatchChatMessage(msg);
        }
      }
      // Handle the direct message format (server sends ChatMessage-shaped data directly)
      else if (message.data &&
               typeof message.data === 'object' && 
               'message_id' in message.data && 
               'channel_id' in message.data && 
               'content' in message.data && 
               'sender_id' in message.data && 
               'timestamp' in message.data) {
        // Server sent a ChatMessage-formatted message directly
        const chatMessage: ChatMessage = {
          message_id: message.data.message_id as number,
          channel_id: message.data.channel_id as number,
          content: message.data.content as string,
          timestamp: message.data.timestamp as string,
          sender_id: message.data.sender_id as number,
          is_action: (message.data.is_action as boolean) || false,
          sender: message.data.sender as any,
          uuid: message.data.uuid as string | undefined
        };

        // Filter out our own messages
        if (chatMessage.sender_id && currentUser && chatMessage.sender_id === currentUser.id) {
          return;
        }

  dispatchChatMessage(chatMessage);
      }
      // The message itself is already ChatMessage-shaped (not nested under `data`)
      else if ('message_id' in message &&
               'channel_id' in message && 
               'content' in message && 
               'sender_id' in message && 
               'timestamp' in message) {
        // The message is directly in ChatMessage format
        const chatMessage: ChatMessage = {
          message_id: (message as any).message_id,
          channel_id: (message as any).channel_id,
          content: (message as any).content,
          timestamp: (message as any).timestamp,
          sender_id: (message as any).sender_id,
          is_action: (message as any).is_action || false,
          sender: (message as any).sender,
          uuid: (message as any).uuid
        };

        // Filter out our own messages
        if (chatMessage.sender_id && currentUser && chatMessage.sender_id === currentUser.id) {
          return;
        }

  dispatchChatMessage(chatMessage);
      }

      // Handle a new notification
      else if (message.event === 'new_private_notification') {
        const notificationEvent = message as NotificationEvent;
        if (notificationEvent.data) {
          // Skip the notification if it's our own message
          if (notificationEvent.data.source_user_id && currentUser && notificationEvent.data.source_user_id === currentUser.id) {
            return;
          }

          const notification: APINotification = {
            id: generateUniqueNotificationId(),
            name: notificationEvent.data.name,
            created_at: new Date().toISOString(),
            object_type: notificationEvent.data.object_type,
            object_id: notificationEvent.data.object_id.toString(),
            source_user_id: notificationEvent.data.source_user_id,
            is_read: false,
            details: notificationEvent.data.details
          };
          
          dispatchNotification(notification);

          // Show the custom notification toast
          const notificationTitle = getNotificationTitle(notification);
          if (notificationTitle) {
            showCustomToast({
              title: notificationTitle,
              message: 'You have a new notification',
              sourceUserId: notification.source_user_id,
              type: 'default'
            });
          }
        }
      }
      
      // Handle the new notification event (including private-message notifications)
      else if (message.event === 'new') {
        if (message.data && typeof message.data === 'object') {
          const data = message.data as any;

          // Build the appropriate notification based on channel type
          if (data.category === 'channel' && data.name === 'channel_message') {
            const channelType = data.details?.type?.toLowerCase();

            let notificationName = 'channel_message';
            let defaultTitle = 'Channel message';

            // Set the notification name and default title by channel type
            switch (channelType) {
              case 'pm':
                notificationName = 'channel_message';
                defaultTitle = 'Private message';
                break;
              case 'team':
                notificationName = 'channel_team';
                defaultTitle = 'Team message';
                break;
              case 'public':
                notificationName = 'channel_public';
                defaultTitle = 'Public channel';
                break;
              case 'private':
                notificationName = 'channel_private';
                defaultTitle = 'Private channel';
                break;
              case 'multiplayer':
                notificationName = 'channel_multiplayer';
                defaultTitle = 'Multiplayer';
                break;
              case 'spectator':
                notificationName = 'channel_spectator';
                defaultTitle = 'Spectator channel';
                break;
              case 'temporary':
                notificationName = 'channel_temporary';
                defaultTitle = 'Temporary channel';
                break;
              case 'group':
                notificationName = 'channel_group';
                defaultTitle = 'Group channel';
                break;
              case 'system':
                notificationName = 'channel_system';
                defaultTitle = 'System channel';
                break;
              case 'announce':
                notificationName = 'channel_announce';
                defaultTitle = 'Announcements';
                break;
              default:
                notificationName = 'channel_message';
                defaultTitle = 'Channel message';
                break;
            }
            
            const notification: APINotification = {
              id: generateUniqueNotificationId(),
              name: notificationName,
              created_at: data.created_at || new Date().toISOString(),
              object_type: data.object_type || 'channel',
              object_id: data.object_id?.toString() || data.id?.toString(),
              source_user_id: data.source_user_id,
              is_read: data.is_read || false,
              details: {
                type: data.details?.type || channelType || 'unknown',
                title: data.details?.title || defaultTitle,
                cover_url: data.details?.cover_url || ''
              }
            };
            
            // Skip creating the notification if it's our own message
            if (notification.source_user_id && currentUser && notification.source_user_id === currentUser.id) {
              return; // return early, don't call onNewNotification
            }

            dispatchNotification(notification);

            // Show the custom notification toast
            const notificationTitle = getNotificationTitle(notification);
            if (notificationTitle) {
              const toastType = channelType === 'pm' ? 'pm' : 
                              channelType === 'team' ? 'team' : 
                              channelType === 'public' ? 'public' : 'default';
              
              let toastMessage = '';
              switch (channelType) {
                case 'pm':
                  // Show the actual message content
                  const messageContent = data.details?.title as string;
                  if (messageContent && messageContent.length > 0 && messageContent !== 'From user') {
                    // Flag the message if it was truncated
                    if (messageContent.length >= 36) {
                      toastMessage = `${messageContent}... (possibly truncated)`;
                    } else {
                      toastMessage = messageContent;
                    }
                  } else {
                    toastMessage = 'Sent you a private message';
                  }
                  break;
                case 'team':
                  const teamMessage = data.details?.title as string;
                  toastMessage = teamMessage || 'Sent a message in team chat';
                  break;
                case 'public':
                  const publicMessage = data.details?.title as string;
                  toastMessage = publicMessage || 'Sent a message in a public channel';
                  break;
                default:
                  const generalMessage = data.details?.title as string;
                  toastMessage = generalMessage || 'Sent a message';
                  break;
              }
              
              showCustomToast({
                title: channelType === 'pm' ? 'New private message' : notificationTitle,
                message: toastMessage,
                sourceUserId: notification.source_user_id,
                type: toastType
              });
            }
          }
          // Other notification types
          else {
            const notification: APINotification = {
              id: generateUniqueNotificationId(),
              name: data.name || 'unknown',
              created_at: data.created_at || new Date().toISOString(),
              object_type: data.object_type || 'unknown',
              object_id: data.object_id?.toString() || data.id?.toString(),
              source_user_id: data.source_user_id,
              is_read: data.is_read || false,
              details: data.details || {}
            };
            
            // Skip the notification if it's our own message
            if (notification.source_user_id && currentUser && notification.source_user_id === currentUser.id) {
              return;
            }

            dispatchNotification(notification);

            // Show the custom notification toast
            const notificationTitle = getNotificationTitle(notification);
            if (notificationTitle) {
              showCustomToast({
                title: notificationTitle,
                message: 'You have a new notification',
                sourceUserId: notification.source_user_id,
                type: 'default'
              });
            }
          }
        }
      }
      
      // Handle error messages
      if (message.error) {
        console.error('WebSocket error:', message.error);
        setConnectionError(message.error);
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [onNewMessage, onNewNotification, currentUser]);

  // Rebind the message handler (singleton reuse)
  useEffect(() => {
    if (globalWsRef) {
      globalWsRef.onmessage = handleMessage;
      wsRef.current = globalWsRef;
    }
  }, [handleMessage]);

  // Register listeners (component level)
  useEffect(() => {
    // Register the connection-state listener
    const connectionStateListener = (connected: boolean, error: string | null) => {
      setIsConnected(connected);
      setConnectionError(error);
    };
    globalConnectionStateListeners.add(connectionStateListener);
    
    if (onNewMessage) {
      globalMessageListeners.add(onNewMessage);
    }
    if (onNewNotification) {
      globalNotificationListeners.add(onNewNotification);
    }
    // Replay the buffer (runs once when a listener is added)
    if (onNewMessage && messageBuffer.length) {
      messageBuffer.splice(0).forEach(m => { try { onNewMessage(m); } catch {} });
    }
    if (onNewNotification && notificationBuffer.length) {
      notificationBuffer.splice(0).forEach(n => { try { onNewNotification(n); } catch {} });
    }
    return () => {
      globalConnectionStateListeners.delete(connectionStateListener);
      if (onNewMessage) globalMessageListeners.delete(onNewMessage);
      if (onNewNotification) globalNotificationListeners.delete(onNewNotification);
      // Don't close the connection on every listener cleanup, to avoid flicker from
      // component re-renders. Closing is handled by disconnect() (auth loss or real unmount).
    };
  }, [onNewMessage, onNewNotification]);

  // Get the notification title
  const getNotificationTitle = (notification: APINotification): string => {
    switch (notification.name) {
      case 'team_application_store':
        return `${notification.details.title} requested to join your team`;
      case 'team_application_accept':
        return 'Your team application was accepted';
      case 'team_application_reject':
        return 'Your team application was rejected';
      case 'channel_message':
        // Show a different title depending on the type
        if (notification.details?.type === 'pm') {
          return `New private message: ${notification.details.title || 'From user'}`;
        } else if (notification.details?.type === 'team') {
          return `New team message: ${notification.details.title || 'Team channel'}`;
        }
        return 'New private message';
      case 'channel_team':
        return `New team message: ${notification.details?.title || 'Team channel'}`;
      case 'channel_public':
        return `New public channel message: ${notification.details?.title || 'Public channel'}`;
      case 'channel_private':
        return `New private channel message: ${notification.details?.title || 'Private channel'}`;
      case 'channel_multiplayer':
        return `New multiplayer message: ${notification.details?.title || 'Multiplayer'}`;
      case 'channel_spectator':
        return `New spectator message: ${notification.details?.title || 'Spectator channel'}`;
      case 'channel_temporary':
        return `New temporary channel message: ${notification.details?.title || 'Temporary channel'}`;
      case 'channel_group':
        return `New group message: ${notification.details?.title || 'Group channel'}`;
      case 'channel_system':
        return `New system message: ${notification.details?.title || 'System channel'}`;
      case 'channel_announce':
        return `New announcement: ${notification.details?.title || 'Announcements'}`;
      default:
        // Try to derive a more meaningful title from details
        if (notification.details?.title) {
          return `New notification: ${notification.details.title}`;
        }
        return 'New notification';
    }
  };

  // Open the WebSocket connection
  const connect = useCallback(async () => {
  if (!isAuthenticated) return;

    // Throttle to avoid frequent reconnects
    const now = Date.now();
  if (now - lastConnectAttemptRef.current < connectionThrottleMs) {
      return;
    }
    lastConnectAttemptRef.current = now;

    // Reuse the global connection if it already exists and isn't closed
    if (globalWsRef && (globalWsRef.readyState === WebSocket.OPEN || globalWsRef.readyState === WebSocket.CONNECTING)) {
      wsRef.current = globalWsRef;
      if (globalWsRef.readyState === WebSocket.OPEN) {
        // Sync the current connection state to local state
        setIsConnected(globalIsConnected);
        setConnectionError(globalConnectionError);
      }
      return;
    }
    if (globalConnecting) {
      return;
    }
    globalConnecting = true;

    const endpoint = await getWebSocketEndpoint();
    if (!endpoint) {
      dispatchConnectionState(false, 'Failed to get WebSocket endpoint');
      return;
    }

    try {
      dispatchConnectionState(false, null);

      // Build the WebSocket URL, adding the auth parameter
      const token = localStorage.getItem('access_token');
      if (!token) {
        dispatchConnectionState(false, 'No access token available');
        return;
      }

      // Ensure the endpoint is a full WebSocket URL
      let wsUrl: string;
      if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
        wsUrl = `${endpoint}?access_token=${encodeURIComponent(token)}`;
      } else {
        // If it's a relative path, build the full WebSocket URL
        const baseUrl = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const host = window.location.host;
        wsUrl = `${baseUrl}${host}${endpoint}?access_token=${encodeURIComponent(token)}`;
      }
  const ws = new WebSocket(wsUrl);
  globalWsRef = ws;

      ws.onopen = () => {
        dispatchConnectionState(true, null);
        reconnectAttemptsRef.current = 0;
        globalConnecting = false;

        // Send the start message
        ws.send(JSON.stringify({
          event: 'chat.start'
        }));
      };  ws.onmessage = handleMessage;

      ws.onclose = () => {
        dispatchConnectionState(false, null);
        if (wsRef.current === ws) wsRef.current = null;
        if (globalWsRef === ws) globalWsRef = null;
        globalConnecting = false;

        // Auto-reconnect
        if (isAuthenticated && (globalMessageListeners.size > 0 || globalNotificationListeners.size > 0) && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelayBase * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          dispatchConnectionState(false, 'Connection lost and max reconnect attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error (singleton):', error);
        console.log('WebSocket URL:', wsUrl);
        console.log('Endpoint:', endpoint);
        dispatchConnectionState(false, `WebSocket connection error: ${endpoint}`);
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      dispatchConnectionState(false, 'Failed to create WebSocket connection');
      globalConnecting = false;
    }
  }, [isAuthenticated, getWebSocketEndpoint, handleMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Only truly close the global connection when no listeners remain
    const shouldClose = globalMessageListeners.size === 0 && globalNotificationListeners.size === 0;
    if (shouldClose && globalWsRef) {
      try {
        if (globalWsRef.readyState === WebSocket.OPEN) {
          globalWsRef.send(JSON.stringify({ event: 'chat.end' }));
        }
        globalWsRef.close();
      } catch { /* ignore */ }
      globalWsRef = null;
    }
    if (wsRef.current && wsRef.current !== globalWsRef) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
    globalConnecting = false;
    dispatchConnectionState(false, null);
    reconnectAttemptsRef.current = 0;

    // Clear the cache
    if (shouldClose) {
      endpointCacheRef.current = null;
      globalEndpointCache = null;
      lastConnectAttemptRef.current = 0;
    }
  }, []);

  // Manage the connection state
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated]);

  // Reconnect when the page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && !isConnected) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isConnected, connect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    reconnect: connect
  };
};
