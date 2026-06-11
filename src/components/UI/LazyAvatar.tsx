import React, { useState, useRef, useEffect } from 'react';

interface LazyAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  alt,
  fallback = '/default.jpg',
  className = '',
  size = 'md'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  // hasError state was unused; removed to silence the TS warning
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Size mapping
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    // Delay avatar load so ranking content renders first
    const timer = setTimeout(() => {
      if (src) {
        const img = new Image();
        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
        };
        img.onerror = () => {
          setImageSrc(fallback);
          setIsLoaded(true);
        };
        img.src = src;
      } else {
        setImageSrc(fallback);
        setIsLoaded(true);
      }
    }, 100); // delay avatar load by 100ms

    return () => clearTimeout(timer);
  }, [isInView, src, fallback]);

  return (
    <div 
      ref={containerRef}
      className={`${sizeClasses[size]} ${className} relative overflow-hidden rounded-lg border-2 transition-colors duration-200`}
      style={{
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Placeholder background - only while the image is loading */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--card-bg)' }} />
      )}
      
      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LazyAvatar;