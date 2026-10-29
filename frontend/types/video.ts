export interface VideoMetadata {
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  aspectRatio?: string;
  filename?: string;
  sizeBytes?: number;
}

export interface PlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}
