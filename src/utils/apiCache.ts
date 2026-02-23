import { chatAPI, userAPI } from './api';
import type { ChatChannel, ChatMessage, User } from '../types';

class APICache {
  private userCache = new Map<number, { data: User; timestamp: number }>();
  private missingUserCache = new Map<number, number>();
  private channelMessagesCache = new Map<number, { data: ChatMessage[]; timestamp: number }>();
  private channelListCache: { data: ChatChannel[]; timestamp: number } | null = null;
  private pendingRequests = new Map<string, Promise<any>>();

  private readonly USER_CACHE_DURATION = 5 * 60 * 1000;
  private readonly MISSING_USER_CACHE_DURATION = 30 * 60 * 1000;
  private readonly CHANNEL_MESSAGES_CACHE_DURATION = 2 * 60 * 1000;
  private readonly CHANNEL_LIST_CACHE_DURATION = 30 * 1000;

  async getUser(userId: number): Promise<User | null> {
    const cacheKey = `user-${userId}`;

    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
      return cached.data;
    }

    const missingCachedAt = this.missingUserCache.get(userId);
    if (missingCachedAt && Date.now() - missingCachedAt < this.MISSING_USER_CACHE_DURATION) {
      return null;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    try {
      const promise = userAPI.getUser(userId);
      this.pendingRequests.set(cacheKey, promise);

      const userData = await promise;
      this.userCache.set(userId, {
        data: userData,
        timestamp: Date.now(),
      });
      this.missingUserCache.delete(userId);
      return userData;
    } catch (error) {
      const statusCode = (error as any)?.response?.status;
      if (statusCode === 404) {
        this.missingUserCache.set(userId, Date.now());
      } else {
        console.error(`Failed to fetch user ${userId}:`, error);
      }
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async getUsers(userIds: number[]): Promise<Map<number, User>> {
    const results = new Map<number, User>();
    const toFetch: number[] = [];

    userIds.forEach((userId) => {
      const cached = this.userCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
        results.set(userId, cached.data);
      } else {
        toFetch.push(userId);
      }
    });

    if (toFetch.length > 0) {
      const batchSize = 5;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const batchPromise = Promise.allSettled(
          batch.map(async (userId) => {
            const user = await this.getUser(userId);
            if (user) {
              results.set(userId, user);
            }
          })
        ).then(() => {});

        promises.push(batchPromise);
      }

      await Promise.all(promises);
    }

    return results;
  }

  async getChannelMessages(channelId: number): Promise<ChatMessage[] | null> {
    const cacheKey = `channel-messages-${channelId}`;

    const cached = this.channelMessagesCache.get(channelId);
    if (cached && Date.now() - cached.timestamp < this.CHANNEL_MESSAGES_CACHE_DURATION) {
      return cached.data;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    try {
      const promise = chatAPI.getChannelMessages(channelId);
      this.pendingRequests.set(cacheKey, promise);

      const messages = await promise;
      if (messages) {
        this.channelMessagesCache.set(channelId, {
          data: messages,
          timestamp: Date.now(),
        });
        return messages;
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch messages for channel ${channelId}:`, error);
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async getChannels(): Promise<ChatChannel[] | null> {
    const cacheKey = 'channel-list';

    if (this.channelListCache && Date.now() - this.channelListCache.timestamp < this.CHANNEL_LIST_CACHE_DURATION) {
      return this.channelListCache.data;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    try {
      const promise = chatAPI.getChannels();
      this.pendingRequests.set(cacheKey, promise);

      const channels = await promise;
      if (channels) {
        this.channelListCache = {
          data: channels,
          timestamp: Date.now(),
        };
        return channels;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  clearCache() {
    this.userCache.clear();
    this.missingUserCache.clear();
    this.channelMessagesCache.clear();
    this.channelListCache = null;
    this.pendingRequests.clear();
  }

  invalidateChannelMessages(channelId: number) {
    this.channelMessagesCache.delete(channelId);
  }

  invalidateChannelList() {
    this.channelListCache = null;
  }

  updateUserCache(userId: number, userData: User) {
    this.missingUserCache.delete(userId);
    this.userCache.set(userId, {
      data: userData,
      timestamp: Date.now(),
    });
  }

  getCachedUser(userId: number): User | null {
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  hasCachedUser(userId: number): boolean {
    const cached = this.userCache.get(userId);
    return !!cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION;
  }
}

export const apiCache = new APICache();
