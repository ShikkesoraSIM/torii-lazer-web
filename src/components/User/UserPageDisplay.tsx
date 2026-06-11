import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import { FaEdit, FaUser } from 'react-icons/fa';
import ContentContainer from '../UI/ContentContainer';
import UserPageEditModal from './UserPageEditModal';
import { parseBBCode } from '../../utils/bbcodeParser';

interface UserPageDisplayProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  className?: string;
}

const UserPageDisplay: React.FC<UserPageDisplayProps> = ({
  user,
  onUserUpdate,
  className = '',
}) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { profileColor } = useProfileColor();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Style tweak to remove image borders
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .user-page-content img {
        border: none !important;
        outline: none !important;
        max-width: 100%;
        height: auto;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Editing is only allowed on your own page
  const canEdit = currentUser?.id === user.id;

  // Read the page content from the user object
  const userPage = user.page;
  // Robust content check: look at the HTML or the raw content
  const hasContent = (userPage?.html && userPage.html.trim()) ||
                    (userPage?.raw && userPage.raw.trim());

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleModalSave = (updatedUser: User) => {
    onUserUpdate?.(updatedUser);
  };

  // Empty state when there's no content
  if (!hasContent) {
    return (
      <div className={className}>
        {canEdit ? (
          // Your own page: show the edit button
          <div className="pt-0 pb-16 min-h-[200px] md:min-h-[250px] flex flex-col">
            {/* Title in the top-left */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('profile.userPage.title')}
              </h3>
            </div>
            
            {/* Centered content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {t('profile.userPage.noContent')}
              </p>
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
                style={{ background: `linear-gradient(180deg, ${profileColor}, ${profileColor}d4)`, boxShadow: `0 12px 32px -10px ${profileColor}` }}
              >
                <FaEdit className="w-4 h-4" />
                <span>{t('profile.userPage.writeButton')}</span>
              </button>
            </div>
          </div>
        ) : (
          // Someone else's page: show the empty state
          <div className="pt-0 pb-16 min-h-[250px] md:min-h-[300px] flex flex-col">
            {/* Title in the top-left */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('profile.userPage.title')}
              </h3>
            </div>
            
            {/* Centered content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <FaUser className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                {user.username} {t('profile.userPage.noContent')}
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {t('profile.userPage.noContent')}
              </p>
            </div>
          </div>
        )}

        {/* Edit modal */}
        <UserPageEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onSave={handleModalSave}
        />
      </div>
    );
  }

  // Normal display when there is content
  return (
    <div className={`${className} min-h-[250px] md:min-h-[300px]`}>
      {/* Header title and edit button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('profile.userPage.title')}
          </h3>
        </div>
        {canEdit && (
          <button
            onClick={handleEditClick}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{ background: `linear-gradient(180deg, ${profileColor}, ${profileColor}d4)`, boxShadow: `0 10px 28px -10px ${profileColor}` }}
          >
            <FaEdit className="w-3 h-3" />
            <span>{t('profile.userPage.editButton')}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <ContentContainer maxHeight={300} className="user-page-content">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {userPage.html ? (
            <div dangerouslySetInnerHTML={{ __html: userPage.html }} />
          ) : userPage.raw ? (
            // No HTML but raw content exists: use the local BBCode parser
            <div dangerouslySetInnerHTML={{ __html: parseBBCode(String(userPage.raw || '')).html }} />
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">
              {t('profile.userPage.processing')}
            </div>
          )}
        </div>
      </ContentContainer>

      <UserPageEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default UserPageDisplay;