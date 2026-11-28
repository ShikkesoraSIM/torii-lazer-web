import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSend, FiSearch } from 'react-icons/fi';
import { chatAPI } from '../../utils/api';
import Avatar from '../UI/Avatar';
import type { User, ChatChannel } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface PrivateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSent: (channel?: ChatChannel) => void;
  currentUser?: User;
}

const PrivateMessageModal: React.FC<PrivateMessageModalProps> = ({
  isOpen,
  onClose,
  onMessageSent,
  currentUser: _currentUser, // currently unused, kept for future use
}) => {
  const { t } = useTranslation();
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetUsername, setTargetUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prevent background scrolling and support Escape key
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  const handleSendMessage = async () => {
    if (!targetUserId || !message.trim()) return;

    try {
      setIsLoading(true);
      const result = await chatAPI.createPrivateMessage(targetUserId, message.trim());

      toast.success(t('messages.privateMessage.toasts.sent'));
      onMessageSent(result?.channel);
      onClose();

      // Reset the form
      setTargetUserId(null);
      setTargetUsername('');
      setMessage('');

      // On success, try to auto-select the newly created channel
      if (result?.channel) {
        // Notify the parent via callback to select the new channel
      }
    } catch (error) {
      console.error('Failed to send private message:', error);
      toast.error(t('messages.privateMessage.toasts.sendFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // No search endpoint yet, so show empty results for now
      toast.error(t('messages.privateMessage.toasts.searchUnsupported'));
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error(t('messages.privateMessage.toasts.searchFailed'));
      setSearchResults([]);
    }
  };

  const selectUser = (user: User) => {
    setTargetUserId(user.id);
    setTargetUsername(user.username);
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pm-modal-title"
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-white/10 rounded-xl shadow-xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 id="pm-modal-title" className="text-xl font-semibold text-white">
              {t('messages.privateMessage.newMessage')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/10"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Select user */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('messages.privateMessage.sendTo')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('messages.privateMessage.searchPlaceholder')}
                  value={targetUsername}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTargetUsername(value);
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                      searchTimeoutRef.current = null;
                    }
                    if (value) {
                      searchTimeoutRef.current = setTimeout(() => {
                        void searchUsers(value);
                      }, 300);
                    } else {
                      setSearchResults([]);
                      setTargetUserId(null);
                    }
                  }}
                  className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-osu-pink focus:border-transparent"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(user => (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="w-full p-3 flex items-center space-x-3 hover:bg-gray-700 transition-colors"
                    >
                      <Avatar
                        userId={user.id}
                        username={user.username}
                        avatarUrl={user.avatar_url}
                        size="sm"
                      />
                      <div className="text-left">
                        <div className="font-medium text-white">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-400">
                          {user.country?.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message body */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('messages.privateMessage.messageLabel')}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('messages.privateMessage.messagePlaceholder')}
                rows={4}
                maxLength={1000}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg resize-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-osu-pink focus:border-transparent"
              />
              <div className="flex justify-between mt-1">
                <div className="text-xs text-gray-400">
                  {message.length}/1000
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!targetUserId || !message.trim() || isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--torii-blue)] text-white rounded-lg hover:bg-[var(--torii-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiSend size={16} />
              <span>{isLoading ? t('messages.privateMessage.sending') : t('messages.privateMessage.send')}</span>
            </button>
          </div>
      </div>
    </div>
  );
};

export default PrivateMessageModal;
