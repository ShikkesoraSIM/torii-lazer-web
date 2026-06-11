import React, { useState, useEffect, useMemo } from 'react';
import { FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../utils/api';
import AvatarUpload from './AvatarUpload';
import { useAuth } from '../../contexts/AuthContext';

const debugLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) console.log(message, data);
};

interface AvatarProps {
  userId?: number;
  username: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  shape?: 'circle' | 'rounded';
  isCurrentUser?: boolean;
  currentUserId?: number;
  editable?: boolean;
  showUploadHint?: boolean;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

/** Key point 1: split the image into its own memo component so hover-state changes don't re-render it */
const ImageBlock = React.memo(function ImageBlock({
  src,
  alt,
  radiusClass,
  isLoading,
  onLoad,
  onError,
}: {
  src: string;
  alt: string;
  radiusClass: string;
  isLoading: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  return (
    <div className="relative w-full h-full" style={{ transform: 'translateZ(0)' }}>
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-300 dark:bg-gray-700 animate-pulse ${radiusClass}`} />
      )}
      <img
        /** Key point 2: don't give <img> any key that forces recalculation; props stay stable on hover so the node isn't rebuilt */
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`block w-full h-full object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${radiusClass} will-change-[opacity]`}
        onLoad={onLoad}
        onError={onError}
        draggable={false}
        style={{ pointerEvents: 'none', backfaceVisibility: 'hidden' }}
      />
    </div>
  );
});

const Avatar: React.FC<AvatarProps> = ({
  userId,
  username,
  avatarUrl,
  size = 'md',
  className = '',
  shape = 'rounded',
  isCurrentUser = false,
  currentUserId,
  editable = false,
  showUploadHint = true,
  onAvatarUpdate,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user: currentUser } = useAuth()

  const isSelf = currentUser && userId && currentUser.id === userId;

  //const shouldShowUpload = Boolean(editable || isSelf);

  const sizeClasses = {
    sm: 'w-8 h-8 min-w-8 min-h-8 text-sm',
    md: 'w-12 h-12 min-w-12 min-h-12 text-base',
    lg: 'w-16 h-16 min-w-16 min-h-16 text-lg',
    xl: 'w-24 h-24 min-w-24 min-h-24 text-xl',
    '2xl': 'w-32 h-32 min-w-32 min-h-32 text-2xl',
  } as const;

  const hoverOverlaySizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-xl',
  } as const;

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  // Only show upload when editable is explicitly true, or when editable is unset and this is the current user
  const shouldShowUpload = editable === true || (editable !== false && isSelf);

  useEffect(() => {
    debugLog('Avatar component state:', {
      shouldShowUpload,
      editable,
      isCurrentUser,
      currentUserId,
      userId,
      username,
    });
  }, [shouldShowUpload, editable, isCurrentUser, currentUserId, userId, username]);

  useEffect(() => {
    const getImageUrl = () => {
      debugLog('Avatar getImageUrl - avatarUrl:', { avatarUrl, userId, username });
      if (avatarUrl && avatarUrl.trim() !== '') return avatarUrl;
      if (userId) return userAPI.getAvatarUrl(userId);
      return '/default.jpg';
    };
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0); // reset the retry counter
    setCurrentImageUrl(getImageUrl());
  }, [userId, username, avatarUrl]);

  const shouldShowImage = currentImageUrl && !imageError;
  const fallbackLetter = (username || '?').charAt(0).toUpperCase();

  const handleImageLoad = () => {
    debugLog('Image loaded:', currentImageUrl);
    setIsLoading(false);
  };

  const handleImageError = () => {
    debugLog('Image failed to load:', currentImageUrl);

    // If this is an API-generated avatar URL and we've retried fewer than 3 times, retry
    if (userId && currentImageUrl.includes(`/users/${userId}/avatar`) && retryCount < 3) {
      debugLog(`Avatar load failed, retrying attempt ${retryCount + 1} in ${1000 * (retryCount + 1)}ms`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        const retryUrl = userAPI.getAvatarUrl(userId, true); // cache-busting retry
        setCurrentImageUrl(retryUrl);
        setIsLoading(true);
      }, 1000 * (retryCount + 1)); // increasing delay: 1s, 2s, 3s
      return;
    }

    // If it's not an API avatar URL or we've hit the retry limit, fall back to the default image
    if (currentImageUrl !== '/default.jpg') {
      debugLog('Trying the default image');
      setCurrentImageUrl('/default.jpg');
      setImageError(false);
      setIsLoading(true);
      setRetryCount(0); // reset the retry counter
    } else {
      debugLog('Default image also failed, showing the letter fallback');
      setImageError(true);
      setIsLoading(false);
      setRetryCount(0); // reset the retry counter
    }
  };

  const handleUploadSuccess = (newAvatarUrl: string) => {
    debugLog('Avatar upload success:', newAvatarUrl);

    // Reset the retry counter and error state
    setRetryCount(0);
    setImageError(false);
    setIsLoading(false);

    // Immediately update the locally displayed avatar URL (with a cache-busting timestamp)
    const urlWithTimestamp = `${newAvatarUrl}${newAvatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setCurrentImageUrl(urlWithTimestamp);

    // Refresh user info after a delay, giving the server time to process the avatar
    setTimeout(() => {
      debugLog('Delayed refresh of user info and avatar cache');
      // If we have a userId, re-fetch the avatar URL via the API (cache-busting)
      if (userId) {
        const refreshedUrl = userAPI.getAvatarUrl(userId, true); // cache-busting
        setCurrentImageUrl(refreshedUrl);
      }
      onAvatarUpdate?.(newAvatarUrl);
    }, 2000); // 2-second delay
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debugLog('Avatar click event fired', {
      shouldShowUpload,
      editable,
      isCurrentUser,
      currentUserId,
      userId,
    });
    if (shouldShowUpload) {
      setShowUploadModal(true);
    }
  };

  /** Key point 3: memoize the overlay content (avoid re-creating it) and drive show/hide with framer-motion */
  const Overlay = useMemo(
    () => (
      <AnimatePresence initial={false}>
        {shouldShowUpload && isHovering && (
          <motion.div
            key="overlay"
            className={`absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center ${radius} z-10 will-change-[opacity,transform]`}
            /** Don't capture events; let the container handle click/hover */
            style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeInOut' }}
          >
            <FiCamera
              className={`${size === 'sm' || size === 'md' ? 'w-4 h-4' : 'w-6 h-6'} text-white mb-1`}
            />
            {showUploadHint && (size === 'lg' || size === 'xl' || size === '2xl') && (
              <span className={`text-white text-xs ${hoverOverlaySizes[size]} text-center px-1 leading-tight`}>
                Click to upload
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    ),
    [shouldShowUpload, isHovering, radius, size, showUploadHint]
  );

  return (
    <>
      <div
        className={[
          sizeClasses[size],
          radius,
          'overflow-hidden flex-shrink-0 shadow-md relative',
          shouldShowUpload ? 'cursor-pointer hover:shadow-lg transition-all duration-200 select-none' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ display: 'inline-block', transform: 'translateZ(0)' }} // Key point 4: force a compositing layer to reduce jitter
        onClick={shouldShowUpload ? handleAvatarClick : undefined}
        onMouseEnter={
          shouldShowUpload
            ? () => {
                debugLog('Mouse entered the avatar area');
                setIsHovering(true);
              }
            : undefined
        }
        onMouseLeave={
          shouldShowUpload
            ? () => {
                debugLog('Mouse left the avatar area');
                setIsHovering(false);
              }
            : undefined
        }
        title={shouldShowUpload ? 'Click to upload avatar' : `${username}'s avatar`}
        role={shouldShowUpload ? 'button' : 'img'}
        tabIndex={shouldShowUpload ? 0 : -1}
        onKeyDown={
          shouldShowUpload
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAvatarClick(e as any);
                }
              }
            : undefined
        }
      >
        {/* Image rendering is decoupled from hover state: ImageBlock's props don't change on hover, so it isn't rebuilt or re-loaded */}
        {shouldShowImage ? (
          <ImageBlock
            src={currentImageUrl}
            alt={`${username}'s avatar`}
            radiusClass={radius}
            isLoading={isLoading}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gray-400 text-white font-bold ${radius}`}>
            {fallbackLetter}
          </div>
        )}

        {/* Framer-motion fade in/out overlay; doesn't affect the <img> lifecycle */}
        {Overlay}
      </div>

      {showUploadModal && (
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={currentImageUrl}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </>
  );
};

export default Avatar;
