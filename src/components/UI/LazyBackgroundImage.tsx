import React, { useEffect, useMemo, useRef, useState } from 'react';

interface LazyBackgroundImageProps {
  src?: string;
  sources?: string[];
  fallback?: string;
  className?: string;
  children: React.ReactNode;
}

const LazyBackgroundImage: React.FC<LazyBackgroundImageProps> = ({
  src,
  sources,
  fallback,
  className = '',
  children,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const elementRef = useRef<HTMLDivElement>(null);

  const sourceCandidates = useMemo(() => {
    const list = sources && sources.length > 0 ? sources : src ? [src] : [];
    return Array.from(
      new Set(
        list
          .map((candidate) => candidate?.trim())
          .filter((candidate): candidate is string => Boolean(candidate))
      )
    );
  }, [sources, src]);

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
        rootMargin: '50px',
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCandidateIndex(0);
    setResolvedSrc(undefined);
    setIsLoaded(false);
    setHasError(false);
    setShowBackground(false);
  }, [sourceCandidates]);

  useEffect(() => {
    if (!isInView || sourceCandidates.length === 0) return;
    const activeSrc = sourceCandidates[candidateIndex];
    if (!activeSrc) return;

    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        setResolvedSrc(activeSrc);
        setIsLoaded(true);
        setHasError(false);
        setTimeout(() => setShowBackground(true), 50);
      };
      img.onerror = () => {
        const hasNextCandidate = candidateIndex < sourceCandidates.length - 1;
        if (hasNextCandidate) {
          setCandidateIndex((previous) => previous + 1);
          return;
        }
        setResolvedSrc(undefined);
        setHasError(true);
        setIsLoaded(false);
      };
      img.src = activeSrc;
    }, 300);

    return () => clearTimeout(timer);
  }, [candidateIndex, isInView, sourceCandidates]);

  const backgroundImage = (() => {
    if (!showBackground) return 'none';
    if (hasError && fallback) return `url(${fallback})`;
    if (isLoaded && resolvedSrc) return `url(${resolvedSrc})`;
    return 'none';
  })();

  const backgroundOpacity = showBackground && isLoaded && !hasError ? 1 : 0;

  return (
    <div ref={elementRef} className={`relative ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: backgroundOpacity,
          transition: 'opacity 0.5s ease-in-out',
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
};

export default LazyBackgroundImage;
