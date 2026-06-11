import React, { useState } from 'react';

interface ProfileCoverProps {
  coverUrl?: string;
  fallbackUrl?: string;
  children: React.ReactNode;
  className?: string;
}

const ProfileCover: React.FC<ProfileCoverProps> = ({
  coverUrl,
  fallbackUrl,
  children,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const backgroundImage = () => {
    if (imageError || (!coverUrl && !fallbackUrl)) {
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    return `url(${coverUrl || fallbackUrl})`;
  };

  return (
    <div className={`relative overflow-hidden w-full max-w-full ${className}`}>
      {/* Responsive fixed aspect-ratio container */}
      <div className="relative w-full max-w-full aspect-[4/3] sm:aspect-[16/6]">
        {/* Background image */}
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: backgroundImage()
          }}
        >
          {/* Gradient overlay - stronger on mobile */}
          <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-black/80 via-black/60 to-black/40 sm:from-black/70 sm:via-black/50 sm:to-black/30"></div>
        </div>

        {/* Loading-state background */}
        {!imageLoaded && (coverUrl || fallbackUrl) && (
          <div className="absolute inset-0 cover-loading">
            <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-gray-400/80 via-gray-400/60 to-gray-400/40 sm:from-gray-400/70 sm:via-gray-400/50 sm:to-gray-400/30"></div>
          </div>
        )}

        {/* Preload image */}
        {(coverUrl || fallbackUrl) && (
          <img
            src={coverUrl || fallbackUrl}
            alt="Profile cover"
            className="hidden"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Content */}
        <div className="absolute inset-0 z-10 w-full max-w-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ProfileCover;
