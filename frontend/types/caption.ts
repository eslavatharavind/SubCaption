import { HighlightMode as TemplateHighlightMode } from './template';

export type HighlightMode = 'none' | 'active-word' | 'keyword' | 'phrase' | 'karaoke' | TemplateHighlightMode;

export type HighlightBackgroundShape = 'none' | 'solid' | 'rounded' | 'pill' | 'marker' | 'underline';

export type HighlightEmphasisEffect =
  | 'none'
  | 'pop'
  | 'bounce'
  | 'pulse'
  | 'glow-pulse'
  | 'shake'
  | 'wobble'
  | 'scale-in'
  | 'blur-sharp';

export type HighlightTimingMode = 'while-spoken' | 'persistent' | 'custom';

export interface WordHighlightTarget {
  wordId?: string;
  wordIndex?: number;
  wordText?: string;
  segmentId?: string;

  styleOverrides?: Partial<StyleData> & {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    italic?: boolean;
    underline?: boolean;
    textColor?: string;
    textOpacity?: number;
    scale?: number;
    strokeEnabled?: boolean;
    strokeColor?: string;
    strokeWidth?: number;
    shadowEnabled?: boolean;
    shadowColor?: string;
    glowEnabled?: boolean;
    glowColor?: string;
    containerType?: HighlightBackgroundShape;
    backgroundColor?: string;
    backgroundOpacity?: number;
    paddingX?: number;
    paddingY?: number;
    borderRadius?: number;
  };

  emphasis?: {
    scale?: number; // e.g. 1.3 for 130%
    supersizePreset?: number; // e.g. 100, 110, 125, 150, 175, 200
    effect?: HighlightEmphasisEffect;
  };

  timing?: {
    mode?: HighlightTimingMode;
    start?: number;
    end?: number;
  };

  source?: 'manual' | 'ai';
}

export interface HighlightData {
  mode: HighlightMode;
  color?: string; // fallback highlight text color e.g. '#FFD600'
  shape?: HighlightBackgroundShape;
  backgroundColor?: string;
  backgroundOpacity?: number;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  scale?: number; // relative scale percentage (50 to 200)
  effect?: HighlightEmphasisEffect;
  timingMode?: HighlightTimingMode;
  targets?: WordHighlightTarget[];
  source?: 'manual' | 'ai';
}

export interface CaptionWord {
  id?: string;
  text: string;
  start: number;
  end: number;
  fontFamily?: string;
  font?: string;
  fontWeight?: number;
  color?: string;
  styleOverrides?: Partial<StyleData>;
  emphasis?: {
    scale?: number;
    supersizePreset?: number;
    effect?: HighlightEmphasisEffect;
  };
  timing?: {
    mode?: HighlightTimingMode;
    start?: number;
    end?: number;
  };
  highlightBg?: string;
  highlightColor?: string;
  highlightShape?: HighlightBackgroundShape;
  isHighlightedTarget?: boolean;
  position_data?: PositionData;
  phraseGroupId?: string;
}

export interface StyleData {
  font: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  highlightColor: string;
  strokeWidth: number;
  strokeColor: string;
  background: string;
  shadow: boolean;
  alignment?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;

  // Rich Text Style Overrides
  italic?: boolean;
  underline?: boolean;
  textOpacity?: number; // 0.0 to 1.0
  textCasing?: 'normal' | 'uppercase' | 'lowercase' | 'capitalize';

  // Outline / Stroke
  strokeEnabled?: boolean;
  strokeOpacity?: number; // 0.0 to 1.0

  // Shadow
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number; // 0.0 to 1.0
  shadowBlur?: number;
  shadowDistance?: number;
  shadowAngle?: number;

  // Text Container / Background
  containerType?: 'none' | 'solid' | 'rounded' | 'pill' | 'strip';
  backgroundColor?: string;
  backgroundOpacity?: number; // 0.0 to 1.0
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;

  // Layout & Spacing
  maxWidth?: number; // 20 to 100 percentage
  maxLines?: number; // 1 to 4

  // Transform
  scale?: number; // 0.5 to 2.0 (50% to 200%)
  rotation?: number; // -180 to 180 degrees
}

export type PresetPositionName =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'middle-left'
  | 'middle-right';

export interface PositionData {
  position?: PresetPositionName;
  offsetY?: number;

  x?: number; // 0.0 to 1.0 (normalized coordinate)
  y?: number; // 0.0 to 1.0 (normalized coordinate)
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'center' | 'bottom';
  rotation?: number;
  scale?: number;
  safeZone?: boolean;
  preset?: string;
  custom?: boolean;
}

export interface WordPositionTarget {
  wordId?: string;
  segmentId?: string;
  wordIndex?: number;
  phraseStartIndex?: number;
  phraseEndIndex?: number;
  wordText?: string;
  startTime?: number;
  endTime?: number;
  position_data: PositionData;
}

import { AnimationConfig } from './animation';

export interface AnimationData extends AnimationConfig {
  type: string;
}

export interface CaptionSegment {
  id: string;
  project_id: string;
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
  style_data: StyleData;
  position_data: PositionData;
  word_positions?: WordPositionTarget[];
  animation_data: AnimationData;
  highlight_data?: HighlightData;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface CaptionSplitRequest {
  segment_id: string;
}

export interface CaptionMergeRequest {
  segment_ids: string[];
}

export type LayerLayering = 'front' | 'behind';

/** Metadata for the caption track itself, shown as one entry in the Layers panel. */
export interface CaptionLayerMeta {
  name: string;
  visible: boolean;
  locked: boolean;
  layering: LayerLayering;
  zIndex: number;
}

export interface TextLayer {
  /** User-facing layer name (falls back to the text). */
  name?: string;
  locked?: boolean;
  layering?: LayerLayering;
  /** 0-1 */
  opacity?: number;
  /** Ratio, 1 = 100% */
  scale?: number;
  id: string;
  text: string;
  zIndex: number;
  position_data?: PositionData;
  style_data?: Partial<StyleData>;
  animation_data?: Partial<AnimationData>;
  highlight_data?: HighlightData;
  startTime?: number;
  endTime?: number;
  visible?: boolean;
}
