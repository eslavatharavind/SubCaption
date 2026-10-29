export type AnimationLevel = 'primary' | 'advanced';

export type EntranceAnimationPreset =
  | 'none'
  | 'fade'
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'pop'
  | 'scale'
  | 'zoom-in'
  | 'bounce'
  | 'float-in'
  | 'wipe-in'
  | 'reveal'
  | 'typewriter';

export type WordAnimationPreset =
  | 'none'
  | 'word-by-word'
  | 'pop-word'
  | 'scale-word'
  | 'fade-word'
  | 'slide-word'
  | 'bounce-word'
  | 'reveal-word'
  | 'blur-sharp-word'
  | 'type-word';

export type KaraokeAnimationPreset =
  | 'none'
  | 'classic-karaoke'
  | 'color-fill'
  | 'progressive-fill'
  | 'active-word'
  | 'active-word-scale'
  | 'active-word-glow'
  | 'active-word-bg'
  | 'underline-progress'
  | 'highlight-sweep'
  | 'word-by-word-reveal';

export type EmphasisAnimationPreset =
  | 'none'
  | 'pop'
  | 'punch'
  | 'impact'
  | 'bounce'
  | 'scale-up'
  | 'pulse'
  | 'shake'
  | 'wobble'
  | 'flash'
  | 'glow-pulse'
  | 'stomp'
  | 'elastic-pop';

export type ExitAnimationPreset =
  | 'none'
  | 'fade-out'
  | 'fade-up-out'
  | 'fade-down-out'
  | 'fade-left-out'
  | 'fade-right-out'
  | 'slide-out'
  | 'scale-out'
  | 'zoom-out'
  | 'blur-out'
  | 'wipe-out'
  | 'collapse'
  | 'flip-out'
  | 'motion-blur-exit'
  | 'elastic-exit'
  | 'spin-exit'
  | 'flip-exit'
  | 'glitch-exit';

export type LoopAnimationPreset =
  | 'none'
  | 'float'
  | 'pulse'
  | 'breathing'
  | 'gentle-scale'
  | 'glow-pulse'
  | 'shake'
  | 'wobble'
  | 'swing'
  | 'bob'
  | 'wave'
  | 'neon-flicker'
  | 'gentle-rotation'
  | 'pendulum'
  | 'elastic-loop';

export type CharacterAnimationPreset =
  | 'none'
  | 'char-fade'
  | 'char-pop'
  | 'char-scale'
  | 'char-bounce'
  | 'char-slide'
  | 'char-reveal'
  | 'char-typewriter'
  | 'char-blur-sharp'
  | 'letter-spacing-reveal'
  | 'char-wave'
  | 'char-stagger'
  | 'char-rotate';

export type AdvancedMotionPreset =
  | 'none'
  | 'position-motion'
  | 'scale-motion'
  | 'rotation-motion'
  | 'opacity-motion'
  | 'blur-motion'
  | 'zoom-motion'
  | 'pan-motion'
  | 'float-motion'
  | 'orbit-motion'
  | 'swing-motion'
  | 'elastic-motion'
  | 'spring-motion'
  | 'multi-axis';

export type AdvancedRevealPreset =
  | 'none'
  | 'mask-reveal'
  | 'clip-reveal'
  | 'directional-reveal'
  | 'center-reveal'
  | 'edge-reveal'
  | 'split-reveal'
  | 'letter-reveal'
  | 'word-reveal'
  | 'line-reveal'
  | 'shape-reveal'
  | 'curtain-reveal'
  | 'stretch-reveal';

export type CreativeEffectPreset =
  | 'none'
  | 'rgb-split'
  | 'digital-glitch'
  | 'scanline'
  | 'flicker'
  | 'film-reveal'
  | 'camera-push'
  | 'cinematic-fade'
  | 'light-sweep'
  | 'neon-flicker-effect'
  | 'glow-pulse-effect'
  | 'vhs'
  | 'crt-flicker';

export type EasingCurve =
  | 'linear'
  | 'ease'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'smooth'
  | 'spring'
  | 'elastic'
  | 'bounce';

export type AnimationDirection = 'up' | 'down' | 'left' | 'right' | 'center' | 'random';

export interface KeyframeItem {
  time: number; // relative 0.0 to 1.0 or timestamp in seconds
  x?: number; // normalized (-1.0 to 1.0)
  y?: number;
  scale?: number;
  rotation?: number; // degrees
  opacity?: number; // 0.0 to 1.0
  blur?: number; // px
  easing?: EasingCurve;
}

export interface AnimationTransformParams {
  startX?: number; // px or %
  endX?: number;
  startY?: number;
  endY?: number;
  startScale?: number;
  endScale?: number;
  startRotation?: number;
  endRotation?: number;
  startOpacity?: number;
  endOpacity?: number;
  startBlur?: number;
  endBlur?: number;
}

export interface AnimationConfig {
  presetId?: string;
  category?: 'entrance' | 'word' | 'karaoke' | 'impact' | 'exit' | 'loop' | 'character' | 'motion' | 'reveal' | 'creative';
  level?: AnimationLevel;
  type?: string; // fallback legacy type property (e.g. 'pop' | 'fade' | 'slide-up')

  // Primary animation options
  entrance?: EntranceAnimationPreset;
  wordAnimation?: WordAnimationPreset;
  characterAnimation?: CharacterAnimationPreset;
  karaokeAnimation?: KaraokeAnimationPreset;
  emphasisAnimation?: EmphasisAnimationPreset;
  exit?: ExitAnimationPreset;
  loop?: LoopAnimationPreset;

  // Advanced animation options
  advancedMotion?: AdvancedMotionPreset;
  advancedReveal?: AdvancedRevealPreset;
  creativeEffect?: CreativeEffectPreset;

  // Timing Controls
  duration?: number; // Entrance/Preset duration in seconds (default 0.35s)
  delay?: number; // Delay before entrance starts (seconds)
  stagger?: number; // Delay between word/character stagger (seconds, e.g. 0.05s)
  startOffset?: number;
  endOffset?: number;
  wordDuration?: number;

  // Easing & Direction Parameters
  easing?: EasingCurve;
  direction?: AnimationDirection;
  intensity?: 'subtle' | 'medium' | 'strong' | 'extreme';

  // Motion Control & Transform Parameters
  transform?: AnimationTransformParams;

  // Keyframe System
  keyframes?: KeyframeItem[];

  // Motion Blur & Custom Curve
  motionBlur?: boolean;
  customCurve?: string;
}

export interface PresetRegistryItem {
  id: string;
  name: string;
  category: 'entrance' | 'word' | 'karaoke' | 'impact' | 'exit' | 'loop' | 'character' | 'motion' | 'reveal' | 'creative';
  level: AnimationLevel;
  description: string;
  config: Partial<AnimationConfig>;
}
