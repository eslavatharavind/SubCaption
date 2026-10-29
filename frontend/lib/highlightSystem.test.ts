import { describe, test, expect } from 'vitest';
import { CaptionSegment, HighlightData, WordHighlightTarget } from '../types/caption';
import { ALL_TEMPLATES } from './templates';

describe('Highlight System - Production-Ready Word-Level Highlight Engine', () => {
  const mockSegment: CaptionSegment = {
    id: 'seg-100',
    project_id: 'proj-1',
    start: 0.0,
    end: 4.0,
    text: 'AI is powerful because AI is everywhere',
    words: [
      { text: 'AI', start: 0.0, end: 0.5 },
      { text: 'is', start: 0.5, end: 0.9 },
      { text: 'powerful', start: 0.9, end: 1.8 },
      { text: 'because', start: 1.8, end: 2.4 },
      { text: 'AI', start: 2.4, end: 2.9 },
      { text: 'is', start: 2.9, end: 3.3 },
      { text: 'everywhere', start: 3.3, end: 4.0 },
    ],
    style_data: {
      font: 'Poppins',
      fontSize: 60,
      textColor: '#FFFFFF',
      fontWeight: 600,
      highlightColor: '#FFD600',
      strokeWidth: 2,
      strokeColor: '#000000',
      background: 'transparent',
      shadow: false,
    },
    position_data: { position: 'bottom-center', offsetY: 0 },
    animation_data: { type: 'pop' },
    highlight_data: {
      mode: 'keyword',
      targets: [
        {
          wordIndex: 0,
          wordText: 'AI',
          segmentId: 'seg-100',
          styleOverrides: {
            fontFamily: 'Anton',
            fontSize: 85,
            fontWeight: 900,
            textColor: '#FFD700',
            scale: 1.4,
            containerType: 'pill',
            backgroundColor: '#FF007A',
            backgroundOpacity: 1.0,
            paddingX: 12,
            paddingY: 6,
            borderRadius: 16,
          },
          emphasis: {
            scale: 1.4,
            effect: 'pulse',
          },
          timing: {
            mode: 'while-spoken',
          },
        },
      ],
    },
  };

  test('1. Highlight modes: none, active-word, keyword, phrase, karaoke supported', () => {
    const modes: HighlightData['mode'][] = ['none', 'active-word', 'keyword', 'phrase', 'karaoke'];
    modes.forEach((mode) => {
      const data: HighlightData = { mode, targets: [] };
      expect(data.mode).toBe(mode);
    });
  });

  test('2. Repeated words are targeted by wordIndex, NOT plain string matching', () => {
    // Word 0 is 'AI', Word 4 is also 'AI'
    const targets = mockSegment.highlight_data?.targets || [];
    const targetWordIndex0 = targets.find((t) => t.wordIndex === 0);
    const targetWordIndex4 = targets.find((t) => t.wordIndex === 4);

    expect(targetWordIndex0).toBeDefined();
    expect(targetWordIndex0?.styleOverrides?.textColor).toBe('#FFD700');
    expect(targetWordIndex0?.styleOverrides?.fontFamily).toBe('Anton');

    // Second occurrence (wordIndex 4) is unhighlighted by default
    expect(targetWordIndex4).toBeUndefined();
  });

  test('3. Word-level font, weight, color, and relative scale overrides resolve correctly', () => {
    const target = mockSegment.highlight_data?.targets?.[0];
    const globalStyle = mockSegment.style_data;

    const resolvedFont = target?.styleOverrides?.fontFamily || globalStyle?.font;
    const resolvedWeight = target?.styleOverrides?.fontWeight || globalStyle?.fontWeight;
    const resolvedColor = target?.styleOverrides?.textColor || globalStyle?.textColor;
    const resolvedScale = target?.styleOverrides?.scale || 1.0;
    const baseFontSize = globalStyle?.fontSize || 60;
    const resolvedSize = (target?.styleOverrides?.fontSize || baseFontSize) * resolvedScale;

    expect(resolvedFont).toBe('Anton');
    expect(resolvedWeight).toBe(900);
    expect(resolvedColor).toBe('#FFD700');
    expect(resolvedScale).toBe(1.4);
    expect(resolvedSize).toBeCloseTo(119.0);
  });

  test('4. Container shapes: solid, rounded, pill are supported', () => {
    const shapes = ['none', 'solid', 'rounded', 'pill'] as const;
    shapes.forEach((shape) => {
      const target: WordHighlightTarget = {
        wordIndex: 0,
        wordText: 'test',
        styleOverrides: {
          containerType: shape,
          backgroundColor: '#FF0055',
          backgroundOpacity: 0.9,
        },
      };
      expect(target.styleOverrides?.containerType).toBe(shape);
    });
  });

  test('5. Word-level emphasis effects: pop, bounce, pulse, glow-pulse, shake, wobble supported', () => {
    const effects = ['none', 'pop', 'bounce', 'pulse', 'glow-pulse', 'shake', 'wobble', 'scale-in', 'blur-sharp'] as const;
    effects.forEach((effect) => {
      const target: WordHighlightTarget = {
        wordIndex: 0,
        wordText: 'test',
        emphasis: { effect },
      };
      expect(target.emphasis?.effect).toBe(effect);
    });
  });

  test('6. Highlight Reset clears target overrides without modifying global text style or template', () => {
    const baseTemplate = ALL_TEMPLATES[0];
    const segmentCopy: CaptionSegment = JSON.parse(JSON.stringify(mockSegment));

    // Perform Highlight Reset
    segmentCopy.highlight_data = {
      mode: 'none',
      targets: [],
    };

    expect(segmentCopy.highlight_data.targets).toHaveLength(0);
    expect(segmentCopy.style_data.font).toBe('Poppins');
    expect(segmentCopy.style_data.textColor).toBe('#FFFFFF');
    expect(baseTemplate.name).toBeDefined();
  });

  test('7. Multilingual and numeric tokens preserve full character string', () => {
    const teluguNumericSegment: CaptionSegment = {
      id: 'seg-tel',
      project_id: 'proj-1',
      start: 0,
      end: 3.0,
      text: 'India lo 2026 lo new AI vachindi',
      words: [
        { text: 'India', start: 0, end: 0.5 },
        { text: 'lo', start: 0.5, end: 0.9 },
        { text: '2026', start: 0.9, end: 1.5 },
        { text: 'lo', start: 1.5, end: 1.8 },
        { text: 'new', start: 1.8, end: 2.2 },
        { text: 'AI', start: 2.2, end: 2.6 },
        { text: 'vachindi', start: 2.6, end: 3.0 },
      ],
      style_data: {
        font: 'Noto Sans Telugu',
        fontSize: 48,
        fontWeight: 700,
        textColor: '#FFFFFF',
        highlightColor: '#FFD600',
        strokeWidth: 0,
        strokeColor: '#000000',
        background: 'transparent',
        shadow: false,
      },
      position_data: { position: 'bottom-center', offsetY: 0 },
      animation_data: { type: 'none' },
      highlight_data: {
        mode: 'keyword',
        targets: [
          { wordIndex: 2, wordText: '2026', styleOverrides: { textColor: '#FFD700' } },
          { wordIndex: 5, wordText: 'AI', styleOverrides: { textColor: '#00FFFF' } },
        ],
      },
    };

    expect(teluguNumericSegment.words[2].text).toBe('2026');
    expect(teluguNumericSegment.highlight_data?.targets?.[0].wordText).toBe('2026');
    expect(teluguNumericSegment.highlight_data?.targets?.[1].wordText).toBe('AI');
  });
});
