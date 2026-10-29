import React, { useEffect, useRef, RefObject } from 'react';
import { CaptionSegment, CaptionWord, TextLayer } from '@/types/caption';
import { TemplateConfig, AspectRatio } from '@/types/template';
import { CaptionOverlay } from '../captions/CaptionOverlay';
import { TextLayersOverlay } from '../captions/TextLayersOverlay';
import { usePersonMask, PersonMaskStatus } from '@/hooks/usePersonMask';
import { PERSON_CUTOUT_Z } from '@/lib/layers';

export interface VideoPlayerProps {
  src: string;
  videoRef: RefObject<HTMLVideoElement>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  activeSegment?: CaptionSegment | null;
  highlightEnabled?: boolean;
  showSafeAreas?: boolean;
  snapEnabled?: boolean;
  aspectRatio?: AspectRatio;
  templateConfig?: TemplateConfig | null;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onVideoDimensions?: (width: number, height: number) => void;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  startSeeking?: () => void;
  endSeeking?: () => void;
  onUpdatePosition?: (pos: any) => void;
  onUpdateWordPosition?: (target: any, pos: any) => void;
  selectedWordIndex?: number | null;
  selectedPhraseRange?: { startIndex: number; endIndex: number } | null;
  onSelectWord?: (segmentId: string, wordIndex: number, word: CaptionWord) => void;
  textLayers?: TextLayer[];
  selectedTextLayerId?: string | null;
  onSelectTextLayer?: (layerId: string) => void;
  onUpdateTextLayerPosition?: (layerId: string, pos: any) => void;
  debugMode?: boolean;
  /** Shown over the canvas while the video is being prepared for editing. */
  loadingLabel?: string;
  /** Layer system: caption track controls and resolved stacking. */
  captionVisible?: boolean;
  captionLocked?: boolean;
  captionZ?: number;
  layerZ?: Record<string, number>;
  /** Run person segmentation and composite the person above "behind" layers. */
  personMaskEnabled?: boolean;
  onPersonMaskState?: (s: { status: PersonMaskStatus; error: string | null; retry: () => void }) => void;
}

export function VideoPlayer({
  src,
  videoRef,
  currentTime,
  duration,
  isPlaying,
  activeSegment = null,
  highlightEnabled = true,
  showSafeAreas = true,
  snapEnabled = true,
  aspectRatio = '9:16',
  templateConfig = null,
  onTimeUpdate,
  onLoadedMetadata,
  onVideoDimensions,
  onTogglePlay,
  onSeek,
  startSeeking,
  endSeeking,
  onUpdatePosition,
  onUpdateWordPosition,
  selectedWordIndex = null,
  selectedPhraseRange = null,
  onSelectWord,
  textLayers = [],
  selectedTextLayerId = null,
  onSelectTextLayer,
  onUpdateTextLayerPosition,
  debugMode = false,
  loadingLabel,
  captionVisible = true,
  captionLocked = false,
  captionZ = 20,
  layerZ,
  personMaskEnabled = false,
  onPersonMaskState,
}: VideoPlayerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const personMask = usePersonMask(videoRef, maskCanvasRef, personMaskEnabled);
  useEffect(() => {
    onPersonMaskState?.({ status: personMask.status, error: personMask.error, retry: personMask.retry });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personMask.status, personMask.error]);

  const handleMetadata = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (vw && vh && onVideoDimensions) {
        onVideoDimensions(vw, vh);
      }
    }
    if (onLoadedMetadata) {
      onLoadedMetadata();
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Aspect ratio canvas container dimensions
  const getAspectRatioClasses = (ratio: AspectRatio) => {
    switch (ratio) {
      case '16:9':
        return 'aspect-[16/9] max-w-[560px] md:max-w-[620px] w-[min(100%,calc(55dvh*1.7778))]';
      case '1:1':
        return 'aspect-square max-w-[380px] md:max-w-[420px] w-[min(100%,55dvh)]';
      case '4:5':
        return 'aspect-[4/5] max-w-[340px] md:max-w-[380px] w-[min(100%,calc(55dvh*0.8))]';
      case '4:3':
        return 'aspect-[4/3] max-w-[480px] md:max-w-[540px] w-[min(100%,calc(55dvh*1.3333))]';
      case '21:9':
        return 'aspect-[21/9] max-w-[600px] md:max-w-[660px] w-[min(100%,calc(55dvh*2.3333))]';
      case '9:16':
      default:
        return 'aspect-[9/16] max-w-[340px] md:max-w-[380px] w-[min(100%,calc(55dvh*0.5625))]';
    }
  };

  return (
    <div className="order-1 lg:order-none flex-none lg:flex-1 flex flex-col bg-[#0B0D10] p-3 sm:p-4 overflow-hidden relative justify-between items-center min-w-0">
      {/* Dynamic Aspect Ratio Canvas Container */}
      <div
        ref={canvasRef}
        className={`flex-none lg:flex-1 ${getAspectRatioClasses(
          aspectRatio
        )} lg:w-full relative overflow-hidden bg-black/80 rounded-2xl border-2 border-[#262D36] shadow-2xl flex items-center justify-center`}
      >
        {loadingLabel && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/70 text-xs font-medium text-white/80" role="status">
            <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-primary-400 animate-spin" aria-hidden="true" />
            {loadingLabel}
          </div>
        )}
        <video
          ref={videoRef}
          src={src || undefined}
          preload="auto"
          playsInline
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={handleMetadata}
          className="w-full h-full object-contain rounded-xl pointer-events-none"
        />

        {/* Person cut-out: the video frame with only the person opaque. Sits between "behind" and "front" layers. */}
        <canvas
          ref={maskCanvasRef}
          data-person-cutout=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ zIndex: PERSON_CUTOUT_Z, display: personMaskEnabled ? 'block' : 'none' }}
        />

        {/* Platform Safe-Area Boundaries */}
        {showSafeAreas && (
          <div className="absolute inset-[8%] border border-dashed border-primary-500/20 pointer-events-none rounded-xl flex flex-col justify-between p-2">
            <span className="text-[9px] font-mono text-primary-400/40 uppercase tracking-widest text-center">
              {aspectRatio} Top Safe Area
            </span>
            <span className="text-[9px] font-mono text-primary-400/40 uppercase tracking-widest text-center">
              {aspectRatio} Bottom Safe Area
            </span>
          </div>
        )}

        {/* Live Caption Overlay strictly bounded to canvas */}
        <CaptionOverlay
          activeSegment={activeSegment}
          currentTime={currentTime}
          highlightEnabled={highlightEnabled}
          templateConfig={templateConfig}
          onUpdatePosition={onUpdatePosition}
          onUpdateWordPosition={onUpdateWordPosition}
          selectedWordIndex={selectedWordIndex}
          selectedPhraseRange={selectedPhraseRange}
          onSelectWord={onSelectWord}
          containerRef={canvasRef}
          showSafeAreas={showSafeAreas}
          snapEnabled={snapEnabled}
          debugMode={debugMode}
          captionVisible={captionVisible}
          captionLocked={captionLocked}
          captionZ={captionZ}
        />

        <TextLayersOverlay
          layers={textLayers}
          currentTime={currentTime}
          templateConfig={templateConfig}
          containerRef={canvasRef}
          snapEnabled={snapEnabled}
          selectedLayerId={selectedTextLayerId}
          layerZ={layerZ}
          onSelectLayer={onSelectTextLayer}
          onUpdateLayerPosition={onUpdateTextLayerPosition}
        />
      </div>

      {/* Playback Controls Bar */}
      <div className="w-full max-w-[380px] h-12 mt-3 bg-[#11151A] border border-[#262D36] rounded-xl px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="py-2 lg:py-1.5 px-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        {/* Seek Progress Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0.1, duration || 0.1)}
          step={0.05}
          value={Math.min(currentTime, duration || currentTime)}
          onPointerDown={() => startSeeking && startSeeking()}
          onPointerUp={() => endSeeking && endSeeking()}
          onPointerCancel={() => endSeeking && endSeeking()}
          onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
          className="flex-1 min-w-0 accent-primary-500 h-1.5 bg-[#1B2129] rounded-lg cursor-pointer"
        />

        <div className="text-[11px] text-brand-muted font-mono shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
