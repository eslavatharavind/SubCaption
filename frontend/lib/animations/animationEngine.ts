import { AnimationConfig, EasingCurve, KeyframeItem } from '@/types/animation';

/**
 * Grapheme-cluster safe Unicode text splitter for Indic (Telugu, Hindi) and English text.
 */
export function getGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (s: any) => s.segment);
    } catch {
      // Fallback below
    }
  }
  return Array.from(text);
}

/**
 * Deterministic Easing Curve Calculator
 */
export function calculateEasing(progress: number, easing: EasingCurve = 'easeOut'): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'linear':
      return p;
    case 'easeIn':
      return p * p * p;
    case 'easeOut':
      return 1 - Math.pow(1 - p, 3);
    case 'easeInOut':
      return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    case 'smooth':
      return p * p * (3 - 2 * p);
    case 'spring': {
      if (p === 0 || p === 1) return p;
      const overshoot = 0.35;
      return 1 + Math.sin(p * Math.PI * 2.5) * Math.exp(-p * 4) * overshoot;
    }
    case 'elastic': {
      if (p === 0 || p === 1) return p;
      return Math.sin(-13 * (p + 1) * Math.PI / 2) * Math.pow(2, -10 * p) + 1;
    }
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let val = p;
      if (val < 1 / d1) {
        return n1 * val * val;
      } else if (val < 2 / d1) {
        val -= 1.5 / d1;
        return n1 * val * val + 0.75;
      } else if (val < 2.5 / d1) {
        val -= 2.25 / d1;
        return n1 * val * val + 0.9375;
      } else {
        val -= 2.625 / d1;
        return n1 * val * val + 0.984375;
      }
    }
    case 'ease':
    default:
      return p * (2 - p);
  }
}

/**
 * Keyframe Interpolation Function
 */
export function interpolateKeyframes(keyframes: KeyframeItem[], progress: number): KeyframeItem {
  if (!keyframes || keyframes.length === 0) {
    return { time: progress };
  }
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (progress <= sorted[0].time) return sorted[0];
  if (progress >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1];

  let prev = sorted[0];
  let next = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (progress >= sorted[i].time && progress <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const range = next.time - prev.time;
  const localP = range > 0 ? (progress - prev.time) / range : 1;
  const easedP = calculateEasing(localP, next.easing || 'linear');

  const interp = (a?: number, b?: number, def: number = 0) => {
    const valA = a !== undefined ? a : def;
    const valB = b !== undefined ? b : valA;
    return valA + (valB - valA) * easedP;
  };

  return {
    time: progress,
    x: interp(prev.x, next.x, 0),
    y: interp(prev.y, next.y, 0),
    scale: interp(prev.scale, next.scale, 1.0),
    rotation: interp(prev.rotation, next.rotation, 0),
    opacity: interp(prev.opacity, next.opacity, 1.0),
    blur: interp(prev.blur, next.blur, 0),
  };
}

export interface RenderedAnimationState {
  containerStyle: React.CSSProperties;
  className: string;
}

/**
 * Compute Centralized Container Animation Styles
 */
export function getContainerAnimationStyles(
  config: AnimationConfig,
  currentTime: number,
  segStart: number,
  segEnd: number
): RenderedAnimationState {
  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;
  let rotation = 0;
  let opacity = 1.0;
  let blur = 0;
  let clipPath = undefined;
  let textShadow = undefined;
  let filter = undefined;
  let extraClassName = '';

  const totalSegDuration = Math.max(0.1, segEnd - segStart);
  const relativeTime = Math.max(0, currentTime - segStart);

  // 1. Entrance / In Calculations
  const entranceType = config.entrance || (config.type as any) || 'none';
  const duration = config.duration ?? 0.35;
  const delay = config.delay ?? 0.0;
  const entranceProgress = relativeTime < delay ? 0 : Math.min(1.0, (relativeTime - delay) / duration);
  const easedEntrance = calculateEasing(entranceProgress, config.easing || 'easeOut');

  if (entranceProgress < 1.0 && entranceType !== 'none') {
    switch (entranceType) {
      case 'fade':
        opacity = Math.max(0.85, easedEntrance);
        break;
      case 'fade-up':
      case 'slide-up':
        opacity = Math.max(0.85, easedEntrance);
        translateY = (1 - easedEntrance) * 14;
        break;
      case 'fade-down':
      case 'slide-down':
        opacity = Math.max(0.85, easedEntrance);
        translateY = (1 - easedEntrance) * -14;
        break;
      case 'fade-left':
      case 'slide-left':
        opacity = Math.max(0.85, easedEntrance);
        translateX = (1 - easedEntrance) * -18;
        break;
      case 'fade-right':
      case 'slide-right':
        opacity = Math.max(0.85, easedEntrance);
        translateX = (1 - easedEntrance) * 18;
        break;
      case 'pop':
      case 'bounce':
        // Caption text must always remain readable and stable: 100% opacity, subtle scale punch
        opacity = 1.0;
        scale = 0.94 + easedEntrance * 0.06;
        break;
      case 'scale':
      case 'zoom-in':
        opacity = 1.0;
        scale = 0.92 + easedEntrance * 0.08;
        break;
      case 'float-in':
        opacity = Math.max(0.9, easedEntrance);
        translateY = (1 - easedEntrance) * 8;
        rotation = (1 - easedEntrance) * -2;
        break;
      case 'wipe-in':
        opacity = 1.0;
        clipPath = `inset(0 ${100 - easedEntrance * 100}% 0 0)`;
        break;
      case 'reveal':
        opacity = Math.max(0.85, easedEntrance);
        clipPath = `circle(${easedEntrance * 100}% at center)`;
        break;
      case 'typewriter':
        // Character/word typewriter handling in renderer
        opacity = 1.0;
        break;
    }
  }

  // 2. Exit / Out Calculations (Keep caption readable right until segment cutoff)
  const exitType = config.exit || 'none';
  const exitDuration = Math.min(0.15, totalSegDuration * 0.15);
  const timeUntilEnd = segEnd - currentTime;

  if (timeUntilEnd < exitDuration && exitType !== 'none' && timeUntilEnd >= 0) {
    const exitProgress = Math.max(0, Math.min(1.0, (exitDuration - timeUntilEnd) / exitDuration));
    const easedExit = calculateEasing(exitProgress, 'easeIn');

    switch (exitType) {
      case 'fade-out':
        opacity = Math.max(0.4, 1 - easedExit);
        break;
      case 'fade-up-out':
        opacity = Math.max(0.4, 1 - easedExit);
        translateY -= easedExit * 15;
        break;
      case 'fade-down-out':
      case 'slide-out':
        opacity = Math.max(0.4, 1 - easedExit);
        translateY += easedExit * 15;
        break;
      case 'fade-left-out':
        opacity = Math.max(0.4, 1 - easedExit);
        translateX -= easedExit * 15;
        break;
      case 'fade-right-out':
        opacity = Math.max(0.4, 1 - easedExit);
        translateX += easedExit * 15;
        break;
      case 'scale-out':
      case 'zoom-out':
        opacity = Math.max(0.5, 1 - easedExit * 0.5);
        scale *= (1 - easedExit * 0.1);
        break;
      case 'blur-out':
        opacity = Math.max(0.5, 1 - easedExit * 0.5);
        blur += easedExit * 4;
        break;
      case 'wipe-out':
        clipPath = `inset(0 0 0 ${easedExit * 100}%)`;
        break;
      case 'collapse':
        scale *= (1 - easedExit * 0.2);
        opacity = Math.max(0.5, 1 - easedExit);
        break;
      case 'flip-out':
        rotation += easedExit * 15;
        opacity = Math.max(0.5, 1 - easedExit);
        break;
    }
  }

  // 3. Loop / Continuous Motion
  const loopType = config.loop || 'none';
  if (loopType !== 'none' && relativeTime >= delay) {
    const loopPhase = (relativeTime * 2 * Math.PI) / 2.0; // 2s loop cycle
    switch (loopType) {
      case 'float':
      case 'bob':
      case 'wave':
        translateY += Math.sin(loopPhase) * 4;
        break;
      case 'pulse':
      case 'breathing':
      case 'gentle-scale':
        scale *= (1.0 + Math.sin(loopPhase) * 0.04);
        break;
      case 'glow-pulse':
        textShadow = `0 0 ${10 + Math.sin(loopPhase) * 6}px rgba(255,214,0,0.8)`;
        break;
      case 'shake':
      case 'wobble':
        translateX += Math.sin(loopPhase * 3) * 2;
        rotation += Math.cos(loopPhase * 3) * 1.5;
        break;
      case 'swing':
      case 'gentle-rotation':
      case 'pendulum':
        rotation += Math.sin(loopPhase) * 3;
        break;
      case 'neon-flicker':
        opacity *= (0.88 + Math.sin(loopPhase * 8) * 0.12);
        break;
    }
  }

  // 4. Advanced Transform & Motion Control Overrides
  if (config.advancedMotion && config.transform && entranceProgress < 1.0) {
    const t = config.transform;
    if (t.startX !== undefined || t.endX !== undefined) {
      translateX = (t.startX ?? 0) + ((t.endX ?? 0) - (t.startX ?? 0)) * easedEntrance;
    }
    if (t.startY !== undefined || t.endY !== undefined) {
      translateY = (t.startY ?? 0) + ((t.endY ?? 0) - (t.startY ?? 0)) * easedEntrance;
    }
    if (t.startScale !== undefined || t.endScale !== undefined) {
      scale = (t.startScale ?? 1) + ((t.endScale ?? 1) - (t.startScale ?? 1)) * easedEntrance;
    }
    if (t.startRotation !== undefined || t.endRotation !== undefined) {
      rotation = (t.startRotation ?? 0) + ((t.endRotation ?? 0) - (t.startRotation ?? 0)) * easedEntrance;
    }
    if (t.startOpacity !== undefined || t.endOpacity !== undefined) {
      opacity = (t.startOpacity ?? 0) + ((t.endOpacity ?? 1) - (t.startOpacity ?? 0)) * easedEntrance;
    }
    if (t.startBlur !== undefined || t.endBlur !== undefined) {
      blur = (t.startBlur ?? 0) + ((t.endBlur ?? 0) - (t.startBlur ?? 0)) * easedEntrance;
    }
  }

  // 5. Keyframe Interpolation Overrides
  if (config.keyframes && config.keyframes.length > 0) {
    const kfState = interpolateKeyframes(config.keyframes, relativeTime / totalSegDuration);
    if (kfState.scale !== undefined) scale = kfState.scale;
    if (kfState.x !== undefined) translateX = kfState.x * 100;
    if (kfState.y !== undefined) translateY = kfState.y * 100;
    if (kfState.rotation !== undefined) rotation = kfState.rotation;
    if (kfState.opacity !== undefined) opacity = kfState.opacity;
    if (kfState.blur !== undefined) blur = kfState.blur;
  }

  // 6. Creative Effects Shader Transformations
  const creative = config.creativeEffect || 'none';
  if (creative !== 'none') {
    if (creative === 'rgb-split') {
      textShadow = `-2px 0 0 rgba(255,0,0,0.8), 2px 0 0 rgba(0,255,255,0.8)`;
    } else if (creative === 'digital-glitch' || creative === 'vhs') {
      const glitchX = (Math.sin(relativeTime * 15) > 0.6) ? 3 : 0;
      translateX += glitchX;
      textShadow = `-1.5px 0 0 #FF0055, 1.5px 0 0 #00FFCC`;
    } else if (creative === 'neon-flicker-effect') {
      textShadow = `0 0 8px #00FFCC, 0 0 16px #00FFCC`;
    }
  }

  let filterStr = undefined;
  if (blur > 0) {
    filterStr = `blur(${blur}px)`;
  }

  const transforms: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    transforms.push(`translate(${translateX}px, ${translateY}px)`);
  }
  if (scale !== 1.0) {
    transforms.push(`scale(${scale})`);
  }
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`);
  }

  const containerStyle: React.CSSProperties = {
    opacity,
    transform: transforms.length > 0 ? transforms.join(' ') : undefined,
    clipPath,
    filter: filterStr,
    textShadow,
    transition: 'none',
  };

  return {
    containerStyle,
    className: extraClassName,
  };
}
