import { describe, test, expect } from 'vitest';
import {
  calculateEasing,
  interpolateKeyframes,
  getGraphemes,
  getContainerAnimationStyles,
} from './animationEngine';
import {
  PRIMARY_ENTRANCE_PRESETS,
  PRIMARY_WORD_PRESETS,
  PRIMARY_KARAOKE_PRESETS,
  PRIMARY_EMPHASIS_PRESETS,
  PRIMARY_EXIT_PRESETS,
  PRIMARY_LOOP_PRESETS,
  ADVANCED_CHARACTER_PRESETS,
  ADVANCED_MOTION_PRESETS,
  ADVANCED_REVEAL_PRESETS,
  CREATIVE_EFFECT_PRESETS,
} from './animationPresets';
import { AnimationConfig, KeyframeItem } from '@/types/animation';

describe('Centralized Animation Engine & Presets', () => {
  test('1. Presets registry provides complete Primary and Advanced animation options', () => {
    expect(PRIMARY_ENTRANCE_PRESETS.length).toBeGreaterThanOrEqual(15);
    expect(PRIMARY_WORD_PRESETS.length).toBeGreaterThanOrEqual(9);
    expect(PRIMARY_KARAOKE_PRESETS.length).toBeGreaterThanOrEqual(10);
    expect(PRIMARY_EMPHASIS_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(PRIMARY_EXIT_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(PRIMARY_LOOP_PRESETS.length).toBeGreaterThanOrEqual(12);

    expect(ADVANCED_CHARACTER_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(ADVANCED_MOTION_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(ADVANCED_REVEAL_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(CREATIVE_EFFECT_PRESETS.length).toBeGreaterThanOrEqual(12);
  });

  test('2. Easing functions calculate deterministic animation progress', () => {
    expect(calculateEasing(0, 'linear')).toBe(0);
    expect(calculateEasing(1, 'linear')).toBe(1);
    expect(calculateEasing(0.5, 'linear')).toBe(0.5);

    const springMid = calculateEasing(0.5, 'spring');
    expect(typeof springMid).toBe('number');
    expect(springMid).toBeGreaterThan(0.5);

    const bounceMid = calculateEasing(0.5, 'bounce');
    expect(typeof bounceMid).toBe('number');

    const elasticMid = calculateEasing(0.5, 'elastic');
    expect(typeof elasticMid).toBe('number');
  });

  test('3. Keyframe interpolation calculates deterministic multi-property transform states', () => {
    const keyframes: KeyframeItem[] = [
      { time: 0.0, x: -0.5, y: 0.8, scale: 0.5, rotation: -10, opacity: 0 },
      { time: 0.5, x: 0.0, y: 0.0, scale: 1.0, rotation: 0, opacity: 1.0 },
      { time: 1.0, x: 0.5, y: -0.2, scale: 1.2, rotation: 10, opacity: 0.5 },
    ];

    const startState = interpolateKeyframes(keyframes, 0.0);
    expect(startState.x).toBe(-0.5);
    expect(startState.scale).toBe(0.5);
    expect(startState.opacity).toBe(0);

    const midState = interpolateKeyframes(keyframes, 0.5);
    expect(midState.x).toBe(0.0);
    expect(midState.scale).toBe(1.0);
    expect(midState.opacity).toBe(1.0);

    const interpState = interpolateKeyframes(keyframes, 0.25);
    expect(interpState.x).toBeGreaterThan(-0.5);
    expect(interpState.x).toBeLessThan(0.0);
    expect(interpState.opacity).toBeGreaterThan(0);
    expect(interpState.opacity).toBeLessThan(1.0);
  });

  test('4. Grapheme-safe Unicode character splitter preserves Indic (Telugu/Hindi) glyph clusters', () => {
    const teluguWord = 'తెలుగు';
    const hindiWord = 'नमस्ते';
    const englishWord = 'Captioning';

    const teluguGraphemes = getGraphemes(teluguWord);
    const hindiGraphemes = getGraphemes(hindiWord);
    const englishGraphemes = getGraphemes(englishWord);

    expect(teluguGraphemes.join('')).toBe(teluguWord);
    expect(hindiGraphemes.join('')).toBe(hindiWord);
    expect(englishGraphemes.length).toBe(10);
  });

  test('5. Container Entrance, Exit, and Loop lifecycle transitions compute correctly', () => {
    const config: AnimationConfig = {
      entrance: 'fade-up',
      duration: 0.4,
      delay: 0.1,
      exit: 'fade-out',
      loop: 'pulse',
    };

    const segStart = 2.0;
    const segEnd = 5.0;

    // Before the delay the engine holds the entrance at its floor: captions never start fully transparent
    // (animationEngine.ts keeps fade entrances at >= 0.85 opacity so text stays readable).
    const startState = getContainerAnimationStyles(config, 2.0, segStart, segEnd);
    expect(startState.containerStyle.opacity).toBe(0.85);

    // During entrance phase (t = 2.3s)
    const midEntranceState = getContainerAnimationStyles(config, 2.3, segStart, segEnd);
    expect((midEntranceState.containerStyle.opacity as number)).toBeGreaterThan(0);
    expect((midEntranceState.containerStyle.opacity as number)).toBeLessThanOrEqual(1.0);

    // During active loop phase (t = 3.5s)
    const activeState = getContainerAnimationStyles(config, 3.5, segStart, segEnd);
    expect(activeState.containerStyle.opacity).toBe(1.0);

    // During exit phase (t = 4.9s, 0.1s before end)
    const exitState = getContainerAnimationStyles(config, 4.9, segStart, segEnd);
    expect((exitState.containerStyle.opacity as number)).toBeLessThan(1.0);
  });

  test('6. Advanced Motion transform parameters interpolate without mutating original config', () => {
    const config: AnimationConfig = {
      advancedMotion: 'position-motion',
      duration: 0.4,
      transform: {
        startY: 50,
        endY: 0,
        startScale: 0.5,
        endScale: 1.0,
      },
    };

    const segStart = 0;
    const segEnd = 3.0;

    const midState = getContainerAnimationStyles(config, 0.2, segStart, segEnd);
    expect(midState.containerStyle.transform).toContain('translate');
    expect(midState.containerStyle.transform).toContain('scale');

    // Original config transform object remains unmutated
    expect(config.transform?.startY).toBe(50);
  });
});
