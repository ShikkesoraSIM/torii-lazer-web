import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMessageCircle, FiX } from 'react-icons/fi';
import Avatar from '../UI/Avatar';
import { friendsAPI } from '../../utils/api';
import type { FriendRelation, User } from '../../types';
import toast from 'react-hot-toast';

interface FriendsListProps {
  currentUser?: User; // reserved prop (currently unused)
  onStartPrivateChat: (user: User) => void;
  onClose: () => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ currentUser: _currentUser, onStartPrivateChat, onClose }) => {
  const [friends, setFriends] = useState<FriendRelation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load the friends list
  useEffect(() => {
    loadFriends();
  }, []);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    };
  }, []);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadFriends = async () => {
    try {
      setIsLoading(true);
      const friendsData = await friendsAPI.getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error('Failed to load friends list:', error);
      toast.error('Failed to load friends list');
    } finally {
      setIsLoading(false);
    }
  };

  // Start a private chat and close the list
  const handleStartPrivateChatAndClose = (user: User) => {
    onStartPrivateChat(user);
    // Close the friends list immediately
    onClose();
  };

  // Remove a friend
  const removeFriend = async (userId: number) => {
    try {
      await friendsAPI.removeFriend(userId);
      toast.success('Friend removed');
      // Reload the friends list
      loadFriends();
    } catch (error) {
      console.error('Failed to remove friend:', error);
      toast.error('Failed to remove friend');
    }
  };



  const filteredFriends = friends.filter(friend => 
    friend.target?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={() => {
        onClose();
      }}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        exit={{ y: 50 }}
        className="bg-card border border-white/10 rounded-lg shadow-xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Friends</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close friends list"
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/10"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Title bar */}
        <div className="py-3 px-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-300">
            Friends list ({friends.length})
          </h3>
        </div>

        {/* Content area */}
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          {/* Search box */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted transition-all"
            />
          </div>

          {/* Friends list */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink mx-auto"></div>
                <p className="text-text-muted mt-2">Loading...</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <FiUser className="mx-auto h-12 w-12 text-text-muted" />
                <p className="text-text-muted mt-2">
                  {searchQuery ? 'No matching friends found' : 'No friends yet'}
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.target_id}
                  className="flex items-center space-x-3 p-3 rounded-xl border border-white/10 hover:bg-white/[0.06] transition-colors"
                >
                  <Avatar
                    userId={friend.target_id}
                    username={friend.target?.username || 'Unknown user'}
                    avatarUrl={friend.target?.avatar_url}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-text-primary truncate">
                        {friend.target?.username || 'Unknown user'}
                      </h3>
                      {friend.mutual && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-full">
                          Mutual
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted">
                      {friend.target?.country_code ? `From ${friend.target.country_code}` : 'Unknown region'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (friend.target) {
                          handleStartPrivateChatAndClose(friend.target);
                        }
                      }}
                      className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Send private message"
                    >
                      <FiMessageCircle size={16} />
                    </button>
                    <button
                      onClick={() => removeFriend(friend.target_id)}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Remove friend"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FriendsList;
