import React, { useEffect, useState } from 'react';

interface LazyFlagProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  src: string;
  alt: string;
  className?: string;
  title?: string;
}

const LazyFlag: React.FC<LazyFlagProps> = ({
  src,
  alt,
  className = '',
  title,
  ...restProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      {...restProps}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-white/10 border border-white/10 rounded animate-pulse" />
      )}

      {!hasError ? (
        <img
          src={src}
          alt={alt}
          title={title}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="absolute inset-0 bg-white/10 flex items-center justify-center border border-white/15 rounded">
          <span className="text-3xs text-text-muted truncate px-0.5">{alt}</span>
        </div>
      )}
    </div>
  );
};

export default LazyFlag;
