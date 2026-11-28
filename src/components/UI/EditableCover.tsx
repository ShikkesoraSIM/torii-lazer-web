import React, { useState, useEffect } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import CoverUpload from './CoverUpload';

interface EditableCoverProps {
  userId?: number;
  username: string;
  coverUrl?: string;
  className?: string;
  editable?: boolean;
  onCoverUpdate?: (newCoverUrl: string) => void;
}

const EditableCover: React.FC<EditableCoverProps> = ({
  userId,
  username,
  coverUrl,
  className = '',
  editable = false,
  onCoverUpdate,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentCoverUrl, setCurrentCoverUrl] = useState(coverUrl);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state when the coverUrl prop changes
  useEffect(() => {
    setCurrentCoverUrl(coverUrl);
    setImageError(false);
    if (coverUrl) {
      setIsLoading(true);
    }
  }, [coverUrl]);

  const handleUploadSuccess = (newCoverUrl: string) => {
    setCurrentCoverUrl(newCoverUrl);
    setImageError(false);
    setIsLoading(true);
    if (onCoverUpdate) {
      onCoverUpdate(newCoverUrl);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  // Default background image
  const defaultCover = '/image/backgrounds/layered-waves-haikei.svg';
  const displayCoverUrl = currentCoverUrl && !imageError ? currentCoverUrl : defaultCover;

  return (
    <>
      <div className={`relative group ${className}`}>
        <div className="w-full osu-gradient rounded-lg overflow-hidden" style={{ aspectRatio: '4/1' }}>
          <div className="relative w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 osu-gradient animate-pulse" />
            )}
            <img
              src={displayCoverUrl}
              alt={`${username}'s cover image`}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        </div>
        
        {editable && (
          <button
            type="button"
            aria-label="Change cover"
            className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/25 [@media(hover:none)]:items-end [@media(hover:none)]:justify-end [@media(hover:none)]:p-2.5"
            onClick={() => setShowUploadModal(true)}
          >
            <div className="text-white text-center inline-flex items-center gap-1.5 sm:block rounded-xl bg-black/70 sm:bg-transparent px-2.5 py-1.5 sm:p-0 border border-white/15 sm:border-0">
              <FiEdit2 className="w-4 h-4 sm:w-6 sm:h-6 sm:mx-auto sm:mb-2" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Change cover</span>
            </div>
          </button>
        )}
      </div>

      {showUploadModal && (
        <CoverUpload
          userId={userId}
          currentCoverUrl={currentCoverUrl}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </>
  );
};

export default EditableCover;
