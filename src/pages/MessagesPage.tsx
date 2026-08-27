import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageCircle, 
  FiBell, 
  FiChevronLeft,
  FiX,
  FiCheck,
  FiUserPlus,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useWebSocketNotifications } from '../hooks/useWebSocketNotifications';
import { chatAPI, teamsAPI } from '../utils/api';
import { apiCache } from '../utils/apiCache';
import { useTranslation } from 'react-i18next';

import MessageBubble from '../components/Chat/MessageBubble';
import ChannelItem from '../components/Chat/ChannelItem';
import MessageInput from '../components/Chat/MessageInput';
import PrivateMessageModal from '../components/Chat/PrivateMessageModal';
import type { 
  ChatChannel, 
  ChatMessage, 
  APINotification
} from '../types';
import toast from 'react-hot-toast';

const convertUTCToLocal = (utcTimeString: string): string => {
  try {
    const utcDate = new Date(utcTimeString);
    return utcDate.toISOString();
  } catch {
    return utcTimeString;
  }
};

type ActiveTab = 'channels' | 'notifications';
type ChannelFilter = 'all' | 'private' | 'team' | 'public';

const MessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('channels');
  const [channels, _setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewPMModal, setShowNewPMModal] = useState(false);
  
  const loadChannelMessages = useCallback(async (channelId: number): Promise<ChatMessage[] | null> => {
    try {
      
      const channelMessages = await apiCache.getChannelMessages(channelId);
      
      if (channelMessages && channelMessages.length > 0) {
        const messagesWithLocalTime = channelMessages.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: convertUTCToLocal(msg.timestamp)
        }));
        
        return messagesWithLocalTime;
      }
      
      return [];
    } catch {
      return null;
    }
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChannelRef = useRef<ChatChannel | null>(null);
  const channelsRef = useRef<ChatChannel[]>([]);
  const initialLoadRef = useRef<boolean>(true);
  const userScrolledUpRef = useRef<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const setChannels = useCallback((value: ChatChannel[] | ((prev: ChatChannel[]) => ChatChannel[])) => {
    _setChannels(prev => {
      const newChannels = typeof value === 'function' ? value(prev) : value;
      channelsRef.current = newChannels;
      return newChannels;
    });
  }, []);

  const updateChannelReadStatus = useCallback((channelId: number, messageId: number) => {
    setChannels(prev => prev.map(channel => {
      if (channel.channel_id === channelId) {
        const newLastReadId = Math.max(channel.last_read_id || 0, messageId);
        return {
          ...channel,
          last_read_id: newLastReadId
        };
      }
      return channel;
    }));
  }, []);

  const {
    notifications,
    unreadCount,
    markAsRead,
    refresh,
    removeNotificationByObject,
  } = useNotificationContext();

  const { isConnected: _chatConnected } = useWebSocketNotifications({
    isAuthenticated,
    currentUser: user,
    onNewMessage: (message) => {
      
      if (message.sender_id === user?.id) {
        return;
      }
      
  
      
      const currentSelectedChannel = selectedChannelRef.current;
      const shouldAddToCurrentChannel = currentSelectedChannel && message.channel_id === currentSelectedChannel.channel_id;
      
      if (shouldAddToCurrentChannel) {
        addMessageToList(message, 'websocket');
      } else if (currentSelectedChannel) { /* no-op */ } else {
        
        const targetChannel = channelsRef.current.find(ch => ch.channel_id === message.channel_id);
        if (targetChannel) {
          
          selectChannelAndAddMessage(targetChannel, message);
        } else {
          
          if (channelsRef.current.length === 0) {
            chatAPI.getChannels().then(channelsData => {
              if (channelsData) {
                setChannels(channelsData);
                const retryChannel = channelsData.find((ch: ChatChannel) => ch.channel_id === message.channel_id);
                if (retryChannel) {
                  selectChannelAndAddMessage(retryChannel, message);
                }
              }
            }).catch(() => {});
          }
        }
      }
    },
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  useEffect(() => {
    if (!isAuthenticated) return;

    const loadChannels = async () => {
      try {
        setIsLoading(true);
        const channelsData = await apiCache.getChannels();
        
        const pmChannels = (channelsData || []).filter((ch: ChatChannel) => ch.type === 'PM');
        if (pmChannels.length > 0) { /* no-op */ }
        
        const channelsWithUserInfo = await Promise.all(
          (channelsData || []).map(async (channel: ChatChannel) => {
            if (channel.type === 'PM' && channel.users.length > 0) {
              try {
                const targetUserId = channel.users.find(id => id !== user?.id);
                if (targetUserId) {
                  
                  const userInfo = await apiCache.getUser(targetUserId);
                  
                  if (userInfo) {
                    return {
                      ...channel,
                      name: `DM: ${userInfo.username}`,
                      user_info: {
                        id: userInfo.id,
                        username: userInfo.username,
                        avatar_url: userInfo.avatar_url || '/default.jpg',
                        cover_url: userInfo.cover_url || userInfo.cover?.url || userInfo.cover?.custom_url || ''
                      }
                    };
                  }
                }
              } catch { /* non-fatal */ }
            }
            return channel;
          })
        );
        
        const sortedChannels = channelsWithUserInfo.sort((a: ChatChannel, b: ChatChannel) => {
          const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
          const aOrder = typeOrder[a.type] || 4;
          const bOrder = typeOrder[b.type] || 4;
          
          if (aOrder !== bOrder) {
            return bOrder - aOrder;
          }
          
          return b.name.localeCompare(a.name);
        });
        
        setChannels(sortedChannels);
        
        setTimeout(() => {
          cleanupDuplicatePrivateChannels();
        }, 100);
        
        if (!selectedChannel && sortedChannels.length > 0) {
          const osuChannel = sortedChannels.find(ch => 
            ch.name.toLowerCase().includes('osu') || 
            ch.name.toLowerCase().includes('#osu') ||
            ch.name === 'osu!'
          );
          
          const channelToSelect = osuChannel || sortedChannels[0];
          selectChannel(channelToSelect);
        }
      } catch { /* non-fatal */ } finally {
        setIsLoading(false);
      }
    };

    loadChannels();
  }, [isAuthenticated]);

  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (notifications.length > 0) {
      
      const processedObjectIds = new Set<string>();
      
      notifications.forEach(notification => {
        if (notification.name === 'channel_message' && 
            notification.details?.type === 'pm') {
          
          const objectKey = `${notification.object_type}-${notification.object_id}`;
          
          if (!processedObjectIds.has(objectKey)) {
            processedObjectIds.add(objectKey);
            handlePrivateMessageNotification(notification);
            
            autoMarkPrivateMessagesAsRead(notification);
          } else { /* no-op */ }
        }
      });
    }
  }, [notifications, channels, user?.id]);

  useEffect(() => {
    return () => {
      const fallbackTimers = (window as any).messageFallbackTimers;
      if (fallbackTimers) {
        fallbackTimers.forEach((timer: NodeJS.Timeout) => clearTimeout(timer));
        fallbackTimers.clear();
      }
    };
  }, []);

  const filteredChannels = channels.filter(channel => {
    switch (channelFilter) {
      case 'private':
        return channel.type === 'PM';
      case 'team':
        return channel.type === 'TEAM';
      case 'public':
        return channel.type === 'PUBLIC';
      default:
        return true;
    }
  });

  const filterOptions = React.useMemo(
    () => [
      { key: 'all' as const, label: t('messages.sidebar.filters.all') },
      { key: 'private' as const, label: t('messages.sidebar.filters.private') },
      { key: 'team' as const, label: t('messages.sidebar.filters.team') },
      { key: 'public' as const, label: t('messages.sidebar.filters.public') },
    ],
    [t]
  );

  const selectChannelAndAddMessage = async (channel: ChatChannel, newMessage: ChatMessage) => {
  initialLoadRef.current = true;
    setSelectedChannel(channel);
    selectedChannelRef.current = channel;
  const requestToken = Symbol('channel-load');
  (selectChannelAndAddMessage as any).currentToken = requestToken;
    
    if (isMobile) {
      setShowSidebar(false);
    }

    try {
      const channelMessages = await loadChannelMessages(channel.channel_id);
      
      if (channelMessages && channelMessages.length > 0) {
        if ((selectChannelAndAddMessage as any).currentToken !== requestToken) {
          return;
        }
        
        const messageExists = channelMessages.find((m: ChatMessage) => m.message_id === newMessage.message_id);
        
        setMessages(prev => {
          const inflight = prev.filter(m => m.channel_id === channel.channel_id);
          const mergedMap = new Map<number, ChatMessage>();
          [...channelMessages, ...inflight].forEach(m => mergedMap.set(m.message_id, m));
          if (!messageExists) {
            mergedMap.set(newMessage.message_id, {
              ...newMessage,
              timestamp: convertUTCToLocal(newMessage.timestamp)
            });
          }
          const all = Array.from(mergedMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return all;
        });
        
        const lastMessage = channelMessages[channelMessages.length - 1];
        throttledMarkAsRead(channel.channel_id, lastMessage.message_id);

        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch { /* non-fatal */ }
        }
      } else {
        setMessages(prev => {
          const inflight = prev.filter(m => m.channel_id === channel.channel_id);
          const exists = inflight.some(m => m.message_id === newMessage.message_id);
            return exists ? inflight : [...inflight, {
              ...newMessage,
              timestamp: convertUTCToLocal(newMessage.timestamp)
            }];
        });
        
        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch { /* non-fatal */ }
        }
      }
    } catch (error) {
      toast.error(t('messages.toasts.loadMessagesFailed'));
      setMessages(prev => {
        let allMessages = [...prev];
        
        const newMessageWithLocalTime = {
          ...newMessage,
          timestamp: convertUTCToLocal(newMessage.timestamp)
        };
        
        const messageExists = allMessages.find(msg => msg.message_id === newMessage.message_id);
        if (!messageExists) {
          allMessages.push(newMessageWithLocalTime);
        }
        
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        return allMessages;
      });
      
      if (channel.type === 'PM') {
        try {
          const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
          if (relatedPmNotifications.some(n => !n.is_read)) {
            await removeNotificationByObject(channel.channel_id.toString(), 'channel');
          }
        } catch { /* non-fatal */ }
      }
    }
  };

  const selectChannel = async (channel: ChatChannel) => {
  initialLoadRef.current = true;
    setSelectedChannel(channel);
    selectedChannelRef.current = channel;
  const requestToken = Symbol('channel-load');
  (selectChannel as any).currentToken = requestToken;
    
    if (isMobile) {
      setShowSidebar(false);
    }

    if (channel.type === 'PM' && channel.users.length > 0) {
      try {
        const targetUserId = channel.users.find(id => id !== user?.id);
        if (targetUserId && !channel.user_info) {
          
          const userInfo = await apiCache.getUser(targetUserId);
          
          if (userInfo) {
            
            setChannels(prev => prev.map(ch => {
              if (ch.channel_id === channel.channel_id) {
                return {
                  ...ch,
                  name: `DM: ${userInfo.username}`,
                  user_info: {
                    id: userInfo.id,
                    username: userInfo.username,
                    avatar_url: userInfo.avatar_url || '/default.jpg',
                    cover_url: userInfo.cover_url || userInfo.cover?.url || userInfo.cover?.custom_url || ''
                  }
                };
              }
              return ch;
            }));
          }
        }
      } catch { /* non-fatal */ }
    }

    try {
      const channelMessages = await loadChannelMessages(channel.channel_id);
      
      if (channelMessages && channelMessages.length > 0) {
        if ((selectChannel as any).currentToken !== requestToken) {
          return;
        }
        
        
        setMessages(prev => {
          const inflight = prev.filter(m => m.channel_id === channel.channel_id);
          const mergedMap = new Map<number, ChatMessage>();
          [...channelMessages, ...inflight].forEach(m => mergedMap.set(m.message_id, m));
          const all = Array.from(mergedMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return all;
        });
        
        const lastMessage = channelMessages[channelMessages.length - 1];
        throttledMarkAsRead(channel.channel_id, lastMessage.message_id);

        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch { /* non-fatal */ }
        }
    } else {
        setMessages(prev => {
      const inflight = prev.filter(m => m.channel_id === channel.channel_id);
      return inflight.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
        
        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch { /* non-fatal */ }
        }
      }
    } catch (error) {
      toast.error(t('messages.toasts.loadMessagesFailed'));
      
      setMessages(prev => {
        return prev;
      });
      
      if (channel.type === 'PM') {
        try {
          const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
          if (relatedPmNotifications.some(n => !n.is_read)) {
            await removeNotificationByObject(channel.channel_id.toString(), 'channel');
          }
        } catch { /* non-fatal */ }
      }
    }
  };

  const addMessageToList = useCallback((message: ChatMessage, _source: 'api' | 'websocket') => {
    
    const currentChannel = selectedChannelRef.current;
    if (!currentChannel || message.channel_id !== currentChannel.channel_id) {
      return;
    }
    
    const messageWithLocalTime = {
      ...message,
      timestamp: convertUTCToLocal(message.timestamp)
    };
    
    setMessages(prev => {
      const existsById = prev.find(m => m.message_id === message.message_id);
      if (existsById) {
        return prev;
      }
      
      
      const newMessages = [...prev, messageWithLocalTime];
      newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
  messagesRef.current = newMessages;
      return newMessages;
    });

    setTimeout(() => {
      throttledMarkAsRead(message.channel_id, message.message_id);
    }, 0);
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!selectedChannel || !messageText.trim()) return;

    try {
      const message = await chatAPI.sendMessage(
        selectedChannel.channel_id,
        messageText.trim()
      );
      
      
      addMessageToList(message, 'api');
      
    } catch (error) {
      toast.error(t('messages.toasts.sendMessageFailed'));
    }
  };

  const throttledMarkAsRead = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      const pendingRequests = new Set<string>();
      const lastReadCache = new Map<number, number>();
      const batchQueue = new Map<number, number>();
      
      const processBatch = async () => {
        if (batchQueue.size === 0) return;
        
        const currentBatch = new Map(batchQueue);
        batchQueue.clear();
        
        const promises = Array.from(currentBatch.entries()).map(async ([channelId, messageId]) => {
          const requestKey = `${channelId}-${messageId}`;
          
          const cachedLastRead = lastReadCache.get(channelId) || 0;
          if (messageId <= cachedLastRead) {
            return;
          }
          
          if (pendingRequests.has(requestKey)) {
            return;
          }
          
          try {
            pendingRequests.add(requestKey);
            
            await chatAPI.markAsRead(channelId, messageId);
            
            lastReadCache.set(channelId, Math.max(cachedLastRead, messageId));
            
            
            updateChannelReadStatus(channelId, messageId);
            
            try {
              await removeNotificationByObject(channelId.toString(), 'channel');
            } catch { /* non-fatal */ }
            
          } catch { /* non-fatal */ } finally {
            pendingRequests.delete(requestKey);
          }
        });
        
        await Promise.allSettled(promises);
      };
      
      return async (channelId: number, messageId: number) => {
        const queuedMessageId = batchQueue.get(channelId);
        if (queuedMessageId && messageId <= queuedMessageId) {
          return;
        }
        
        const cachedLastRead = lastReadCache.get(channelId) || 0;
        if (messageId <= cachedLastRead) {
          return;
        }
        
        batchQueue.set(channelId, Math.max(queuedMessageId || 0, messageId));
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(processBatch, 1500);
      };
    })(),
    [updateChannelReadStatus, removeNotificationByObject]
  );

  useEffect(() => {
    const container = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
    if (!container) return;
    const el = container as HTMLElement;
    const onScroll = () => {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceToBottom > 120;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    const currentChannel = selectedChannelRef.current;
    if (!currentChannel) return;

    const container = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
    let nearBottom = true;
    if (container) {
      const el = container as HTMLElement;
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      nearBottom = distanceToBottom < 150;
    }

    const isOwnMessage = lastMessage.sender_id === user?.id;
    const isInitial = initialLoadRef.current;

    if (isInitial) {
      initialLoadRef.current = false;
      setTimeout(() => {
        const containerEl = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
        if (containerEl) {
          (containerEl as HTMLElement).scrollTop = (containerEl as HTMLElement).scrollHeight;
        } else {
          messagesEndRef.current?.scrollIntoView();
        }
      }, 50);
      return;
    }

    if (!userScrolledUpRef.current || nearBottom || isOwnMessage) {
      const containerEl = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
      if (containerEl) {
        (containerEl as HTMLElement).scrollTop = (containerEl as HTMLElement).scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView();
      }
    }

    if (lastMessage.message_id > (currentChannel.last_read_id || 0)) {
      throttledMarkAsRead(currentChannel.channel_id, lastMessage.message_id);
    }
  }, [messages, throttledMarkAsRead, user?.id]);

  useEffect(() => {
    if (!selectedChannel || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && selectedChannel) {
            const messageElement = entry.target as HTMLElement;
            const messageId = parseInt(messageElement.dataset.messageId || '0');
            const channelId = selectedChannel.channel_id;
            
            if (messageId > 0 && messageId > (selectedChannel.last_read_id || 0)) {
              
              const timeoutId = setTimeout(() => {
                if (selectedChannel && selectedChannel.channel_id === channelId) {
                  throttledMarkAsRead(channelId, messageId);
                }
              }, 1000);
              
              messageElement.dataset.readTimeout = timeoutId.toString();
            }
          } else {
            const messageElement = entry.target as HTMLElement;
            const timeoutId = messageElement.dataset.readTimeout;
            if (timeoutId) {
              clearTimeout(parseInt(timeoutId));
              delete messageElement.dataset.readTimeout;
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.6
      }
    );

    const messageElements = document.querySelectorAll(`[data-message-id]`);
    messageElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      messageElements.forEach((element) => {
        const timeoutId = (element as HTMLElement).dataset.readTimeout;
        if (timeoutId) {
          clearTimeout(parseInt(timeoutId));
        }
      });
      observer.disconnect();
    };
  }, [messages, selectedChannel, throttledMarkAsRead]);

  const handleNotificationMarkAsRead = useCallback(async (notification: typeof notifications[0]) => {
    try {
      
      await markAsRead(notification.id);
      
      if (notification.name === 'channel_message') {
        const channelId = parseInt(notification.object_id);
        
        const targetChannel = channels.find(channel => channel.channel_id === channelId);
        
        if (targetChannel) {
          setSelectedChannel(targetChannel);
          if (isMobile) {
            setShowSidebar(false);
          }
          
          setTimeout(() => {
            removeNotificationByObject(notification.object_id, notification.object_type);
          }, 500);
        } else { /* no-op */ }
      }
    } catch { /* non-fatal */ }
  }, [markAsRead, channels, removeNotificationByObject, setSelectedChannel, setShowSidebar, isMobile, notifications]);

  useEffect(() => {
  }, [unreadCount]);

  useEffect(() => {
    if (!notifications.length) return;

    const userIdsToFetch = new Set<number>();
    
    notifications.forEach(notification => {
      if (notification.source_user_id) {
        userIdsToFetch.add(notification.source_user_id);
      }
    });

    if (userIdsToFetch.size > 0) {
      apiCache.getUsers(Array.from(userIdsToFetch))
        .then(() => {
          setActiveTab(prev => prev);
        })
        .catch(() => {});
    }
  }, [notifications]);

  const cleanupDuplicatePrivateChannels = () => {
    setChannels(prev => {
      const uniqueChannels: ChatChannel[] = [];
      const seenUserPairs = new Set<string>();
      
      prev.forEach(channel => {
        if (channel.type === 'PM') {
          const currentUserId = user?.id || 0;
          const otherUsers = channel.users.filter(id => id !== currentUserId);
          
          if (otherUsers.length > 0) {
            const userPairKey = otherUsers.sort().join(',');
            const fullPairKey = `${currentUserId}-${userPairKey}`;
            
            if (!seenUserPairs.has(fullPairKey)) {
              seenUserPairs.add(fullPairKey);
              uniqueChannels.push(channel);
            } else { /* no-op */ }
          } else {
            uniqueChannels.push(channel);
          }
        } else {
          uniqueChannels.push(channel);
        }
      });
      
      return uniqueChannels;
    });
  };

  const handlePrivateMessageNotification = async (notification: APINotification) => {
    if (notification.name === 'channel_message' && notification.details?.type === 'pm') {
      try {
        
        const sourceUserId = notification.source_user_id;
        
        if (!sourceUserId) {
          return;
        }
        
        const existingChannel = channels.find(ch => {
          if (ch.type !== 'PM') return false;
          
          const hasCurrentUser = ch.users.includes(user?.id || 0);
          const hasTargetUser = ch.users.includes(sourceUserId);
          
          return hasCurrentUser && hasTargetUser;
        });
        
        if (existingChannel) {
          return;
        }
        
        
        let userName = notification.details.title as string || 'Unknown user';
        let userAvatarUrl = '';
        let userCoverUrl = '';
        
        try {
          const userInfo = await apiCache.getUser(sourceUserId);
          
          if (userInfo) {
            userName = userInfo.username || userName;
            userAvatarUrl = userInfo.avatar_url || '/default.jpg';
            userCoverUrl = userInfo.cover_url || userInfo.cover?.url || userInfo.cover?.custom_url || '';
          }
        } catch {
          userAvatarUrl = '/default.jpg';
        }
        
        const newPrivateChannel: ChatChannel = {
          channel_id: parseInt(notification.object_id.toString()),
          name: `DM: ${userName}`,
          description: `DM with ${userName}`,
          type: 'PM',
          moderated: false,
          users: [user?.id || 0, sourceUserId],
          current_user_attributes: {
            can_message: true,
            can_message_error: undefined,
            last_read_id: 0
          },
          last_read_id: 0,
          last_message_id: 0,
          recent_messages: [],
          message_length_limit: 1000,
          user_info: {
            id: sourceUserId,
            username: userName,
            avatar_url: userAvatarUrl,
            cover_url: userCoverUrl
          }
        };
        
        
        setChannels(prev => {
          const isDuplicate = prev.some(ch => {
            if (ch.type !== 'PM') return false;
            
            const hasCurrentUser = ch.users.includes(user?.id || 0);
            const hasTargetUser = ch.users.includes(sourceUserId);
            
            return hasCurrentUser && hasTargetUser;
          });
          
          if (isDuplicate) {
            return prev;
          }
          
          const newChannels = [...prev, newPrivateChannel];
          
          return newChannels.sort((a: ChatChannel, b: ChatChannel) => {
            const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
            const aOrder = typeOrder[a.type] || 4;
            const bOrder = typeOrder[b.type] || 4;
            
            if (aOrder !== bOrder) {
              return bOrder - aOrder;
            }
            
            return b.name.localeCompare(a.name);
          });
        });
        
        
        const messageContent = notification.details?.title as string;
        if (messageContent) {
          
          const chatMessage: ChatMessage = {
            message_id: Date.now() + Math.random(),
            channel_id: parseInt(notification.object_id.toString()),
            content: messageContent,
            timestamp: notification.created_at,
            sender_id: sourceUserId,
            is_action: false,
          };
          
          
          const currentChannel = selectedChannelRef.current;
          if (!currentChannel || currentChannel.channel_id === newPrivateChannel.channel_id) {
            addMessageToList(chatMessage, 'websocket');
          } else { /* no-op */ }
        }
        
      } catch { /* non-fatal */ }
    }
  };

  const autoMarkPrivateMessagesAsRead = async (notification: APINotification) => {
    if (notification.name !== 'channel_message' || notification.details?.type !== 'pm') {
      return;
    }

    const calculateTextSimilarity = (text1: string, text2: string): number => {
      if (text1 === text2) return 1.0;
      if (text1.length === 0 || text2.length === 0) return 0.0;

      const longerText = text1.length > text2.length ? text1 : text2;
      const shorterText = text1.length > text2.length ? text2 : text1;
      
      let matches = 0;
      const shorterLength = shorterText.length;
      
      for (let i = 0; i <= longerText.length - shorterLength; i++) {
        const window = longerText.substring(i, i + shorterLength);
        if (window === shorterText) {
          matches = shorterLength;
          break;
        }
        
        let charMatches = 0;
        for (let j = 0; j < shorterLength; j++) {
          if (window[j] === shorterText[j]) {
            charMatches++;
          }
        }
        matches = Math.max(matches, charMatches);
      }
      
      return matches / shorterLength;
    };

    const deduplicateMessages = (messages: ChatMessage[]): ChatMessage[] => {
      const uniqueMessages: ChatMessage[] = [];
      const seenContents = new Set<string>();
      
      messages.forEach(message => {
        const normalizedContent = message.content
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();
        
        let isDuplicate = false;
        for (const seenContent of seenContents) {
          const similarity = calculateTextSimilarity(normalizedContent, seenContent);
          if (similarity > 0.9) {
            isDuplicate = true;
            // messageId: message.message_id,
             // content: message.content.substring(0, 30),
             // similarity: similarity.toFixed(2)
            //});
            break;
          }
        }
        
        if (!isDuplicate) {
          uniqueMessages.push(message);
          seenContents.add(normalizedContent);
        }
      });
      
      return uniqueMessages;
    };

    try {
      const channelId = parseInt(notification.object_id.toString());
      const notificationTitle = notification.details?.title as string;
      

      const targetChannel = channels.find(ch => ch.channel_id === channelId && ch.type === 'PM');
      
      if (!targetChannel) {
        return;
      }

      const channelMessages = await chatAPI.getChannelMessages(channelId);
      
      if (!channelMessages || channelMessages.length === 0) {
        return;
      }


      const isCurrentlyViewingChannel = selectedChannel?.channel_id === channelId;
      
      const normalizeText = (text: string) => {
        return text
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s\u4e00-\u9fff]/g, '')
          .toLowerCase();
      };

      const matchingMessages = channelMessages.filter((message: ChatMessage) => {
        if (!notificationTitle || !message.content) {
          return false;
        }

        const normalizedTitle = normalizeText(notificationTitle);
        const normalizedContent = normalizeText(message.content);
        
        const exactMatch = normalizedContent === normalizedTitle;
        const contentIncludesTitle = normalizedContent.includes(normalizedTitle);
        const titleIncludesContent = normalizedTitle.includes(normalizedContent);
        
        const similarity = calculateTextSimilarity(normalizedTitle, normalizedContent);
        const similarityMatch = similarity > 0.8;
        
        const isMatch = exactMatch || contentIncludesTitle || titleIncludesContent || similarityMatch;
        
        if (isMatch) { /* no-op */ }
        
        return isMatch;
      });

      const uniqueMessages = deduplicateMessages(matchingMessages);

      let shouldMarkAsRead = false;
      let maxMessageIdToMark = 0;

      if (uniqueMessages.length > 0) {
        maxMessageIdToMark = Math.max(...uniqueMessages.map((m: ChatMessage) => m.message_id));
        shouldMarkAsRead = true;
      } else if (isCurrentlyViewingChannel) {
        maxMessageIdToMark = Math.max(...channelMessages.map((m: ChatMessage) => m.message_id));
        shouldMarkAsRead = true;
      }

      if (shouldMarkAsRead && maxMessageIdToMark > 0) {
        const currentLastReadId = targetChannel.last_read_id || 0;
        
        if (maxMessageIdToMark > currentLastReadId) {
          
          await chatAPI.markAsRead(channelId, maxMessageIdToMark);
          
          updateChannelReadStatus(channelId, maxMessageIdToMark);
          
          try {
            await removeNotificationByObject(notification.object_id, notification.object_type);
          } catch { /* non-fatal */ }
        } else { /* no-op */ }
      } else { /* no-op */ }
      
    } catch { /* non-fatal */ }
  };

  const batchMarkPrivateNotificationsAsRead = async () => {
    let privateNotifications = notifications.filter(notification => 
      notification.name === 'channel_message' && 
      notification.details?.type === 'pm'
    );


    if (privateNotifications.length === 0) {
      toast(t('messages.toasts.noPrivateNotifications'));
      return;
    }

    const deduplicatedNotifications = deduplicateNotifications(privateNotifications);

    let processedCount = 0;
    let errorCount = 0;

    for (const notification of deduplicatedNotifications) {
      try {
        await autoMarkPrivateMessagesAsRead(notification);
        processedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch {
        errorCount++;
      }
    }

    const resultMessage = t('messages.toasts.processResult', {
      success: processedCount,
      fail: errorCount,
    });
    console.log(resultMessage);
    
    if (errorCount > 0) {
      toast.error(resultMessage);
    } else {
      toast.success(resultMessage);
    }

    setTimeout(() => {
      refresh();
    }, 1000);
  };

  const deduplicateNotifications = (notifications: APINotification[]): APINotification[] => {
    const uniqueNotifications: APINotification[] = [];
    const seenCombinations = new Set<string>();
    
    notifications.forEach(notification => {
      const channelId = notification.object_id;
      const title = (notification.details?.title as string) || '';
      const normalizedTitle = title.trim().replace(/\s+/g, ' ').toLowerCase();
      
      const combinationKey = `${channelId}-${normalizedTitle}`;
      
      if (!seenCombinations.has(combinationKey)) {
        seenCombinations.add(combinationKey);
        uniqueNotifications.push(notification);
      } else { /* no-op */ }
    });
    
    return uniqueNotifications;
  };

  const getNotificationTitle = useCallback((notification: APINotification): string => {
    const fallback = (key: string) => t(`messages.notificationsPanel.fallbacks.${key}`);
    const resolveTitle = (value: unknown, fallbackKey: string) =>
      typeof value === 'string' && value.trim().length > 0 ? value : fallback(fallbackKey);

    let userName = t('messages.sidebar.unknownUser');
    if (notification.source_user_id) {
      const cachedUser = apiCache.getCachedUser(notification.source_user_id);
      if (cachedUser) {
        userName = cachedUser.username || t('messages.sidebar.unknownUser');
      }
    }

    switch (notification.name) {
      case 'team_application_store':
        return t('messages.notificationsPanel.titles.teamApplication');
      case 'team_application_accept':
        return t('messages.notificationsPanel.titles.teamApplicationAccept');
      case 'team_application_reject':
        return t('messages.notificationsPanel.titles.teamApplicationReject');
      case 'channel_message':
        if (notification.details?.type === 'pm') {
          return t('messages.notificationsPanel.titles.privateMessage', { userName });
        }
        if (notification.details?.type === 'team') {
          return t('messages.notificationsPanel.titles.teamMessage', {
            title: resolveTitle(notification.details?.title, 'teamChannel'),
          });
        }
        return t('messages.notificationsPanel.titles.privateMessage', { userName });
      case 'channel_team':
        return t('messages.notificationsPanel.titles.teamMessage', {
          title: resolveTitle(notification.details?.title, 'teamChannel'),
        });
      case 'channel_public':
        return t('messages.notificationsPanel.titles.publicMessage', {
          title: resolveTitle(notification.details?.title, 'publicChannel'),
        });
      case 'channel_private':
        return t('messages.notificationsPanel.titles.privateChannelMessage', {
          title: resolveTitle(notification.details?.title, 'privateChannel'),
        });
      case 'channel_multiplayer':
        return t('messages.notificationsPanel.titles.multiplayerMessage', {
          title: resolveTitle(notification.details?.title, 'multiplayer'),
        });
      case 'channel_spectator':
        return t('messages.notificationsPanel.titles.spectatorMessage', {
          title: resolveTitle(notification.details?.title, 'spectator'),
        });
      case 'channel_temporary':
        return t('messages.notificationsPanel.titles.temporaryChannelMessage', {
          title: resolveTitle(notification.details?.title, 'temporary'),
        });
      case 'channel_group':
        return t('messages.notificationsPanel.titles.groupMessage', {
          title: resolveTitle(notification.details?.title, 'group'),
        });
      case 'channel_system':
        return t('messages.notificationsPanel.titles.systemMessage', {
          title: resolveTitle(notification.details?.title, 'system'),
        });
      case 'channel_announce':
        return t('messages.notificationsPanel.titles.announcementMessage', {
          title: resolveTitle(notification.details?.title, 'announcement'),
        });
      default:
        return notification.name;
    }
  }, [t]);

  const getNotificationContent = useCallback((notification: APINotification): string => {
    const fallback = (key: string) => t(`messages.notificationsPanel.fallbacks.${key}`);
    const resolveTitle = (value: unknown, fallbackKey: string) =>
      typeof value === 'string' && value.trim().length > 0 ? value : fallback(fallbackKey);

    let userName = t('messages.sidebar.unknownUser');
    if (notification.source_user_id) {
      const cachedUser = apiCache.getCachedUser(notification.source_user_id);
      if (cachedUser) {
        userName = cachedUser.username || t('messages.sidebar.unknownUser');
      }
    }

    switch (notification.name) {
      case 'team_application_store':
        return t('messages.notificationsPanel.contents.teamApplication', { userName });
      case 'team_application_accept':
        return t('messages.notificationsPanel.contents.teamApplicationAccept', {
          teamName: resolveTitle(notification.details?.title, 'teamChannel'),
        });
      case 'team_application_reject':
        return t('messages.notificationsPanel.contents.teamApplicationReject');
      case 'channel_message':
        if (notification.details?.type === 'pm') {
          const messageContent = notification.details.title as string;
          const messageUrl = notification.details.url as string;
          const placeholders = [
            t('messages.notificationsPanel.contents.privateMessageSourceRaw'),
            userName,
            t('messages.notificationsPanel.contents.privateMessageSourceLabel'),
          ];

          if (typeof messageContent === 'string' && messageContent.trim() && !placeholders.includes(messageContent)) {
            if (messageContent.length >= 36) {
              return t('messages.notificationsPanel.contents.privateMessageTruncated', {
                userName,
                message: messageContent,
              });
            }
            return t('messages.notificationsPanel.contents.privateMessage', {
              userName,
              message: messageContent,
            });
          }

          if (typeof messageUrl === 'string' && messageUrl.trim().length > 0) {
            return t('messages.notificationsPanel.contents.privateMessageWithId', {
              userName,
              id: notification.object_id,
            });
          }

          return t('messages.notificationsPanel.contents.privateMessageFallback', { userName });
        }

        if (notification.details?.type === 'team') {
          return t('messages.notificationsPanel.contents.teamChannel', {
            title: resolveTitle(notification.details?.title, 'teamMessage'),
          });
        }

        return t('messages.notificationsPanel.contents.genericFrom', {
          source: resolveTitle(notification.details?.title, 'unknownSource'),
        });
      case 'channel_team':
        return t('messages.notificationsPanel.contents.teamChannel', {
          title: resolveTitle(notification.details?.title, 'teamMessage'),
        });
      case 'channel_public':
        return t('messages.notificationsPanel.contents.publicChannel', {
          title: resolveTitle(notification.details?.title, 'publicMessage'),
        });
      case 'channel_private':
        return t('messages.notificationsPanel.contents.privateChannel', {
          title: resolveTitle(notification.details?.title, 'privateMessage'),
        });
      case 'channel_multiplayer':
        return t('messages.notificationsPanel.contents.multiplayerChannel', {
          title: resolveTitle(notification.details?.title, 'multiplayerMessage'),
        });
      case 'channel_spectator':
        return t('messages.notificationsPanel.contents.spectatorChannel', {
          title: resolveTitle(notification.details?.title, 'spectatorMessage'),
        });
      case 'channel_temporary':
        return t('messages.notificationsPanel.contents.temporaryChannel', {
          title: resolveTitle(notification.details?.title, 'temporaryMessage'),
        });
      case 'channel_group':
        return t('messages.notificationsPanel.contents.groupChannel', {
          title: resolveTitle(notification.details?.title, 'groupMessage'),
        });
      case 'channel_system':
        return t('messages.notificationsPanel.contents.systemChannel', {
          title: resolveTitle(notification.details?.title, 'systemMessage'),
        });
      case 'channel_announce':
        return t('messages.notificationsPanel.contents.announcementChannel', {
          title: resolveTitle(notification.details?.title, 'announcementMessage'),
        });
      default:
        return JSON.stringify(notification.details);
    }
  }, [t]);

  const hasUserInfoInCache = useCallback((userId: number): boolean => {
    return apiCache.hasCachedUser(userId);
  }, []);

  const getUserInfoFromCache = useCallback((userId: number): { username: string; avatar_url?: string } | null => {
    return apiCache.getCachedUser(userId);
  }, []);

  const handleTeamRequest = async (notification: APINotification, action: 'accept' | 'reject') => {
    try {
      const teamId = parseInt(notification.object_id);
      const userId = notification.source_user_id;
      
      if (!userId) {
        toast.error(t('messages.toasts.teamRequestMissingUser'));
        return;
      }

      if (action === 'accept') {
        await teamsAPI.acceptJoinRequest(teamId, userId);
        toast.success(t('messages.toasts.teamRequestAcceptSuccess'));
      } else {
        await teamsAPI.rejectJoinRequest(teamId, userId);
        toast.success(t('messages.toasts.teamRequestRejectSuccess'));
      }

      await markAsRead(notification.id);
    } catch (error) {
      toast.error(
        t('messages.toasts.teamRequestActionFailed', {
          action: action === 'accept' ? t('messages.actions.accept') : t('messages.actions.reject'),
        })
      );
    }
  };

  // Mientras no sepamos quien sos no se decide nada. Sin esto la pantalla de
  // "necesitas iniciar sesion" le ganaba la carrera a la respuesta del server y
  // le aparecia a gente que SI estaba logueada, nada mas por abrir el link
  // directo en vez de llegar por un boton.
  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('messages.loginRequired.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('messages.loginRequired.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-gray-900">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: isMobile ? -320 : 0, opacity: isMobile ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? -320 : 0, opacity: isMobile ? 0 : 1 }}
            transition={{ duration: 0.3 }}
            className={`
              ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
              w-80 bg-card border-r border-card
              flex flex-col ${isMobile ? 'h-screen max-h-screen' : 'h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]'}
            `}
          >
            <div className="p-4 border-b border-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('messages.sidebar.title')}
                  </h1>
                  {/* <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${chatConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div> */}
                </div>
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(false)}
                    aria-label={t('common.close')}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>

              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('channels')}
                  className={`
                    flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeTab === 'channels'
                      ? 'bg-white dark:bg-gray-600 text-osu-pink shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <FiMessageCircle size={16} />
                  <span>{t('messages.sidebar.tabs.channels')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`
                    flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium
                    transition-all duration-200 relative
                    ${activeTab === 'notifications'
                      ? 'bg-white dark:bg-gray-600 text-osu-pink shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <FiBell size={16} />
                  <span>{t('messages.sidebar.tabs.notifications')}</span>
                  {unreadCount.total > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount.total > 99 ? '99+' : unreadCount.total}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'channels' ? (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-card space-y-3">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {filterOptions.map(filter => (
                        <button
                          key={filter.key}
                          onClick={() => setChannelFilter(filter.key)}
                          className={`
                            py-1.5 px-2 rounded text-center font-medium transition-all duration-200
                            ${channelFilter === filter.key
                              ? 'bg-osu-pink text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                          `}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={async () => {
                        try {
                          const channels = await chatAPI.getChannels();
                          const pmChannels = channels.filter((ch: ChatChannel) => ch.type === 'PM');
                          if (pmChannels.length > 0) { /* no-op */ }
                          
                          const sortedChannels = channels.sort((a: ChatChannel, b: ChatChannel) => {
                            const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
                            const aOrder = typeOrder[a.type] || 4;
                            const bOrder = typeOrder[b.type] || 4;
                            
                            if (aOrder !== bOrder) {
                              return bOrder - aOrder;
                            }
                            
                            return b.name.localeCompare(a.name);
                          });
                          
                          setChannels(sortedChannels);
                          
                          setTimeout(() => {
                            cleanupDuplicatePrivateChannels();
                          }, 100);
                          
                          toast.success(
                            t('messages.toasts.refreshChannelsSuccess', {
                              total: channels.length,
                              privateCount: pmChannels.length,
                            })
                          );
                        } catch (error) {
                          toast.error(t('messages.toasts.refreshFailed'));
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors text-sm font-medium"
                      title={t('messages.sidebar.tooltips.refreshChannels')}
                      aria-label={t('messages.sidebar.tooltips.refreshChannels')}
                    >
                      <FiRefreshCw size={16} />
                      <span>{t('messages.sidebar.actions.refreshChannels')}</span>
                    </button>

                    <button
                      onClick={() => setShowNewPMModal(true)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-osu-pink/10 text-osu-pink hover:bg-osu-pink/20 rounded-lg transition-colors text-sm font-medium"
                    >
                      <FiPlus size={16} />
                      <span>{t('messages.sidebar.actions.newPrivateChat')}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('messages.sidebar.states.loading')}
                      </div>
                    ) : filteredChannels.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('messages.sidebar.states.noChannels')}
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {filteredChannels.map(channel => (
                          <ChannelItem
                            key={channel.channel_id}
                            channel={channel}
                            isSelected={selectedChannel?.channel_id === channel.channel_id}
                            onClick={() => selectChannel(channel)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="p-2 border-b border-card space-y-2">
                    <button
                      onClick={() => {
                        refresh();
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors text-sm font-medium"
                      title={t('messages.sidebar.tooltips.refreshNotifications')}
                      aria-label={t('messages.sidebar.tooltips.refreshNotifications')}
                    >
                      <FiRefreshCw size={16} />
                      <span>{t('messages.sidebar.actions.refreshNotifications')}</span>
                    </button>
                    
                    <button
                      onClick={batchMarkPrivateNotificationsAsRead}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 rounded-lg transition-colors text-sm font-medium"
                      title={t('messages.sidebar.tooltips.markPrivateRead')}
                      aria-label={t('messages.sidebar.tooltips.markPrivateRead')}
                    >
                      <FiCheck size={16} />
                      <span>{t('messages.sidebar.actions.markPrivateRead')}</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('messages.sidebar.states.noNotifications')}
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {notifications.map((notification, index) => (
                          <div
                            key={`notification-${notification.object_type}-${notification.object_id}-${notification.source_user_id || 'no-user'}-${index}`}
                            className="p-3 rounded-lg border border-card bg-card"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                {notification.source_user_id && hasUserInfoInCache(notification.source_user_id) ? (
                                  <img
                                    src={getUserInfoFromCache(notification.source_user_id)?.avatar_url || '/default.jpg'}
                                    alt={t('messages.sidebar.avatarAlt')}
                                    className="w-10 h-10 rounded-lg object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  notification.source_user_id && hasUserInfoInCache(notification.source_user_id) ? 'hidden' : ''
                                } ${
                                  notification.name.includes('team_application') 
                                    ? 'bg-orange-500/20' 
                                    : notification.name.includes('channel') 
                                    ? 'bg-blue-500/20' 
                                    : 'bg-gray-500/20'
                                }`}>
                                  {notification.name.includes('team_application') && (
                                    <FiUserPlus className="text-orange-500" size={20} />
                                  )}
                                  {notification.name.includes('channel') && (
                                    <FiMessageCircle className="text-blue-500" size={20} />
                                  )}
                                  {!notification.name.includes('team_application') && !notification.name.includes('channel') && (
                                    <FiBell className="text-gray-500" size={20} />
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {getNotificationTitle(notification)}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {getNotificationContent(notification)}
                                </p>
                                
                                {notification.source_user_id && hasUserInfoInCache(notification.source_user_id) && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {t('messages.sidebar.from')}
                                    </span>
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                      {(() => {
                                        const cachedUser = getUserInfoFromCache(notification.source_user_id!);
                                        return cachedUser?.username || t('messages.sidebar.unknownUser');
                                      })()}
                                    </span>
                                  </div>
                                )}
                                
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                                
                                {notification.name === 'team_application_store' && (
                                  <div className="flex space-x-2 mt-3">
                                    <button
                                      onClick={() => handleTeamRequest(notification, 'accept')}
                                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
                                    >
                                      <FiCheck size={14} />
                                      <span>{t('messages.actions.accept')}</span>
                                    </button>
                                    <button
                                      onClick={() => handleTeamRequest(notification, 'reject')}
                                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                                    >
                                      <FiX size={14} />
                                      <span>{t('messages.actions.reject')}</span>
                                    </button>
                                  </div>
                                )}

                                {!notification.is_read && (
                                  <button
                                    onClick={() => handleNotificationMarkAsRead(notification)}
                                    className="text-xs text-osu-pink hover:text-osu-pink/80 mt-2"
                                  >
                                    {t('messages.sidebar.markAsRead')}
                                  </button>
                                )}
                              </div>
                          </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-hidden">
        {selectedChannel ? (
          <>
            <div className="mt-[2px] h-16 bg-card border-b border-card flex items-center px-4 flex-shrink-0">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {selectedChannel.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedChannel.type === 'PM'
                      ? t('messages.sidebar.channelTypes.private')
                      : selectedChannel.type === 'TEAM'
                        ? t('messages.sidebar.channelTypes.team')
                        : t('messages.sidebar.channelTypes.public')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                
                let isGrouped = false;
                if (prevMessage && prevMessage.sender_id === message.sender_id) {
                  isGrouped = false;
                }
                
                return (
                  <div key={`message-${message.message_id}-${message.channel_id}-${index}`} data-message-id={message.message_id}>
                    <MessageBubble
                      message={message}
                      currentUser={user || undefined}
                      isGrouped={isGrouped}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0">
              <MessageInput
                onSendMessage={sendMessage}
                disabled={!selectedChannel?.current_user_attributes?.can_message}
                placeholder={
                  selectedChannel?.current_user_attributes?.can_message_error ||
                  t('messages.chat.placeholder')
                }
                maxLength={selectedChannel?.message_length_limit || 1000}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="mb-4 p-3 bg-osu-pink text-white rounded-lg"
                  aria-label={t('messages.sidebar.openSidebar')}
                >
                  <FiMessageCircle size={24} />
                </button>
              )}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('messages.sidebar.selectPromptTitle')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('messages.sidebar.selectPromptDescription')}
              </p>
            </div>
          </div>
        )}
      </div>

      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <PrivateMessageModal
        isOpen={showNewPMModal}
        onClose={() => setShowNewPMModal(false)}
        onMessageSent={async (newChannel) => {
          
          if (isAuthenticated && newChannel) {
            try {
              const channels = await chatAPI.getChannels();
              
              const sortedChannels = channels.sort((a: ChatChannel, b: ChatChannel) => {
                const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
                const aOrder = typeOrder[a.type] || 4;
                const bOrder = typeOrder[b.type] || 4;
                
                if (aOrder !== bOrder) {
                  return bOrder - aOrder;
                }
                
                return b.name.localeCompare(a.name);
              });
              
              setChannels(sortedChannels);
              
              await selectChannel(newChannel);
              
            } catch (error) {
              toast.error(t('messages.toasts.loadPrivateChannelFailed'));
            }
          }
        }}
        currentUser={user || undefined}
      />
    </div>
  );
};

export default MessagesPage;
