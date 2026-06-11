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
            className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={() => setShowUploadModal(true)}
          >
            <div className="text-white text-center">
              <FiEdit2 className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Change cover</span>
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
