import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  currentUrl?: string;
}

interface AudioContextType extends AudioState {
  play: (url: string) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  audioElement: HTMLAudioElement | null;
}

const AudioContext = createContext<AudioContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | undefined>(undefined);
  const lastTimeEmitRef = useRef<number>(0);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    isLoading: false,
    currentUrl: undefined,
  });

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = 0.7;

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleTimeUpdate = () => {
      const now = performance.now();
      if (now - lastTimeEmitRef.current < 240 && !audio.ended) return;
      lastTimeEmitRef.current = now;
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };

    const handleEnded = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
      }));
    };

    const handleVolumeChange = () => {
      setState(prev => ({
        ...prev,
        volume: audio.volume,
        isMuted: audio.muted,
      }));
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
      }));
      console.error('Audio playback error');
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentUrlRef.current !== url) {
      currentUrlRef.current = url;
      audio.src = url;
      setState(prev => ({ ...prev, currentUrl: url, currentTime: 0 }));
    }

    audio.play().catch(console.error);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setState(prev => ({ ...prev, currentTime: 0 }));
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
  }, []);

  const contextValue = useMemo<AudioContextType>(() => ({
    ...state,
    play,
    pause,
    stop,
    seek,
    setVolume,
    toggleMute,
    audioElement: audioRef.current,
  }), [state, play, pause, stop, seek, setVolume, toggleMute]);

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};

// Play button component (similar to osu-web's design)
interface AudioPlayButtonProps {
  audioUrl: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export const AudioPlayButton: React.FC<AudioPlayButtonProps> = ({
  audioUrl,
  className = '',
  size = 'md',
  showProgress = false,
}) => {
  const { play, pause, stop, isPlaying, currentUrl, currentTime, duration, isLoading } = useAudio();
  
  const isCurrentTrack = currentUrl === audioUrl;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  
  const progress = isCurrentTrack && duration > 0 ? (currentTime / duration) * 100 : 0;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const handleClick = () => {
    if (isCurrentlyPlaying) {
      pause();
    } else if (isCurrentTrack) {
      play(audioUrl);
    } else {
      stop();
      play(audioUrl);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`
        relative flex items-center justify-center rounded-full
        bg-osu-pink hover:bg-osu-pink/80 text-white shadow-lg
        transition-colors duration-200
        ${sizeClasses[size]} ${className}
      `}
      disabled={isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Progress ring */}
      {showProgress && isCurrentTrack && (
        <motion.svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 36 36"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <path
            className="text-white/20"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <motion.path
            className="text-white"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeDasharray={`${progress}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            initial={{ strokeDasharray: "0, 100" }}
            animate={{ strokeDasharray: `${progress}, 100` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </motion.svg>
      )}
      
      {/* Play/pause icon */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isLoading && isCurrentTrack ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <RotateCcw size={iconSizes[size]} className="animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={isCurrentlyPlaying ? 'pause' : 'play'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {isCurrentlyPlaying ? (
                <Pause size={iconSizes[size]} />
              ) : (
                <Play size={iconSizes[size]} className="ml-0.5" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

// Full audio player control bar (like osu-web's main player)
interface AudioPlayerControlsProps {
  className?: string;
}

export const AudioPlayerControls: React.FC<AudioPlayerControlsProps> = ({ className = '' }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    currentUrl,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
  } = useAudio();

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  // Compute the progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumeProgress = volume * 100;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateProgressFromClientX = useCallback((clientX: number) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }, [duration, seek]);

  const handleProgressPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDraggingProgress(true);
    updateProgressFromClientX(e.clientX);
  }, [updateProgressFromClientX]);

  const updateVolumeFromClientX = useCallback((clientX: number) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolume(ratio);
  }, [setVolume]);

  const handleVolumePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDraggingVolume(true);
    updateVolumeFromClientX(e.clientX);
  }, [updateVolumeFromClientX]);

  const handleProgressKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!duration) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      seek(Math.min(duration, currentTime + 5));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seek(Math.max(0, currentTime - 5));
    }
  }, [currentTime, duration, seek]);

  const handleVolumeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setVolume(Math.min(1, volume + 0.1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setVolume(Math.max(0, volume - 0.1));
    }
  }, [volume, setVolume]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingProgress) updateProgressFromClientX(e.clientX);
      if (isDraggingVolume) updateVolumeFromClientX(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDraggingProgress(false);
      setIsDraggingVolume(false);
    };

    if (isDraggingProgress || isDraggingVolume) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDraggingProgress, isDraggingVolume, updateProgressFromClientX, updateVolumeFromClientX]);

  if (!currentUrl) return null;

  return (
    <div className={`
      fixed bottom-4 right-4 z-50
      w-1/3 min-w-[280px] max-w-[400px]
      sm:min-w-[320px] md:w-1/3 lg:w-1/4
      bg-[#0d122c]/95 border border-white/15
      rounded-2xl shadow-elev-3 backdrop-blur-md
      px-3 py-2 flex items-center gap-2 sm:gap-3
      max-sm:bottom-2 max-sm:right-2 max-sm:left-2 max-sm:w-auto
      ${className}
    `}>
      <button
        type="button"
        onClick={isPlaying ? pause : () => currentUrl && play(currentUrl)}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-torii hover:bg-torii-hover active:scale-95 text-white transition flex-shrink-0 shadow-elev-1"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-1 sm:gap-2">
        <span className="text-xs text-text-muted min-w-[28px] sm:min-w-[32px] hidden xs:block">
          {formatTime(currentTime)}
        </span>

        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Audio playback position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onKeyDown={handleProgressKeyDown}
          onPointerDown={handleProgressPointerDown}
          className={`flex-1 h-2 bg-white/15 rounded-full group overflow-hidden touch-none ${
            isDraggingProgress ? 'cursor-grabbing' : 'cursor-pointer'
          }`}
        >
          <div
            className="h-full bg-torii rounded-full relative"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-text-muted min-w-[28px] sm:min-w-[32px] hidden xs:block">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume control */}
      <div className="items-center gap-1.5 flex-shrink-0 hidden sm:flex">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
          className="p-1 text-text-muted hover:text-torii transition-colors rounded"
        >
          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <div
          ref={volumeRef}
          role="slider"
          tabIndex={0}
          aria-label="Audio volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volumeProgress)}
          onKeyDown={handleVolumeKeyDown}
          onPointerDown={handleVolumePointerDown}
          className={`w-14 h-2 bg-white/15 rounded-full overflow-hidden touch-none ${
            isDraggingVolume ? 'cursor-grabbing' : 'cursor-pointer'
          }`}
        >
          <div
            className="h-full bg-torii rounded-full"
            style={{ width: `${volumeProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
