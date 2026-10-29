import { useState, useRef, useEffect, RefObject } from 'react';
import { PlaybackState } from '@/types/video';

export function useVideo(videoRef: RefObject<HTMLVideoElement>) {
  const [playback, setPlayback] = useState<PlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isMuted: false,
    volume: 1,
  });

  const isSeekingRef = useRef(false);

  // Smooth 60fps time-driven animation loop during video playback
  useEffect(() => {
    let animId: number;

    if (playback.isPlaying) {
      const tick = () => {
        if (videoRef.current && !isSeekingRef.current) {
          const cur = videoRef.current.currentTime;
          setPlayback((prev) => {
            if (Math.abs(prev.currentTime - cur) >= 0.01) {
              return { ...prev, currentTime: cur };
            }
            return prev;
          });
        }
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [playback.isPlaying, videoRef]);

  // Keep React state in sync with the element (end of video, browser-initiated pauses).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPause = () => setPlayback((prev) => ({ ...prev, isPlaying: false, currentTime: v.currentTime }));
    const onPlay = () => setPlayback((prev) => ({ ...prev, isPlaying: true }));
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onPause);
    v.addEventListener('play', onPlay);
    return () => {
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onPause);
      v.removeEventListener('play', onPlay);
    };
  }, [videoRef]);

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeekingRef.current) {
      const cur = videoRef.current.currentTime;
      setPlayback((prev) => ({
        ...prev,
        currentTime: cur,
      }));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (!isNaN(dur) && isFinite(dur)) {
        setPlayback((prev) => ({
          ...prev,
          duration: dur,
        }));
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      // Use the element's real state; play() always resumes from the current position.
      if (!videoRef.current.paused) {
        videoRef.current.pause();
        setPlayback((prev) => ({ ...prev, isPlaying: false }));
      } else {
        videoRef.current.play().then(() => {
          setPlayback((prev) => ({ ...prev, isPlaying: true }));
        }).catch(() => {
          setPlayback((prev) => ({ ...prev, isPlaying: false }));
        });
      }
    }
  };

  const startSeeking = () => {
    isSeekingRef.current = true;
  };

  const endSeeking = () => {
    isSeekingRef.current = false;
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      const dur = playback.duration || (videoRef.current.duration ?? 0);
      const clamped = Math.max(0, dur > 0 ? Math.min(seconds, dur) : Math.max(0, seconds));
      videoRef.current.currentTime = clamped;
      setPlayback((prev) => ({ ...prev, currentTime: clamped }));
    }
  };

  const setVolume = (val: number) => {
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setPlayback((prev) => ({
        ...prev,
        volume: val,
        isMuted: val === 0,
      }));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMute = !playback.isMuted;
      videoRef.current.muted = newMute;
      setPlayback((prev) => ({ ...prev, isMuted: newMute }));
    }
  };

  return {
    playback,
    handleTimeUpdate,
    handleLoadedMetadata,
    togglePlay,
    seekTo,
    startSeeking,
    endSeeking,
    setVolume,
    toggleMute,
  };
}
