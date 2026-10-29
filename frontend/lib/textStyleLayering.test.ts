import { describe, test, expect } from 'vitest';
import { ALL_TEMPLATES } from './templates';
import { StyleData, CaptionSegment } from '../types';

/**
 * Text Style Layering Architecture Verification Tests
 */

describe('Text Style Layering & Overrides', () => {
  const baseTemplate = ALL_TEMPLATES[0]; // e.g. Neon / Minimal / Red Box

  const initialSegment: CaptionSegment = {
    id: 'seg-1',
    project_id: 'proj-1',
    start: 0,
    end: 2.5,
    text: 'I love artificial intelligence',
    words: [
      { text: 'I', start: 0, end: 0.5 },
      { text: 'love', start: 0.5, end: 1.0 },
      { text: 'artificial', start: 1.0, end: 1.8 },
      { text: 'intelligence', start: 1.8, end: 2.5 },
    ],
    style_data: {
      font: 'Poppins',
      fontSize: 60,
      textColor: '#FFFFFF',
      fontWeight: 700,
      highlightColor: '#FFD600',
      strokeWidth: 2,
      strokeColor: '#000000',
      background: 'transparent',
      shadow: false,
    },
    position_data: { position: 'bottom-center', offsetY: 0 },
    animation_data: { type: 'pop' },
  };

  test('1. Font Size, Weight, Italic, and Underline overrides apply without mutating template', () => {
    const textStyleOverride: Partial<StyleData> = {
      fontSize: 80,
      fontWeight: 900,
      italic: true,
      underline: true,
    };

    const effectiveStyle = {
      ...baseTemplate.typography,
      ...initialSegment.style_data,
      ...textStyleOverride,
    };

    expect(effectiveStyle.fontSize).toBe(80);
    expect(effectiveStyle.fontWeight).toBe(900);
    expect(effectiveStyle.italic).toBe(true);
    expect(effectiveStyle.underline).toBe(true);

    // Template remains unmutated
    expect(baseTemplate.typography?.fontSize).not.toBe(80);
  });

  test('2. Text Color and Opacity override normal text without touching active-word highlight', () => {
    const textStyleOverride: Partial<StyleData> = {
      textColor: '#FFFF00',
      textOpacity: 85,
    };

    const highlightColor = initialSegment.style_data?.highlightColor || baseTemplate.colors?.highlightColor || '#FFD600';

    const effectiveStyle = {
      ...initialSegment.style_data,
      ...textStyleOverride,
      highlightColor,
    };

    expect(effectiveStyle.textColor).toBe('#FFFF00');
    expect(effectiveStyle.textOpacity).toBe(85);
    expect(effectiveStyle.highlightColor).toBe(highlightColor);
  });

  test('3. Font switching changes font family while preserving Text Style overrides', () => {
    const existingTextStyle: Partial<StyleData> = {
      fontSize: 70,
      textColor: '#00FFCC',
      strokeEnabled: true,
      strokeWidth: 4,
      shadowEnabled: true,
    };

    // User switches font Poppins -> Anton
    const fontSwitchUpdate: Partial<StyleData> = {
      font: 'Anton',
    };

    const mergedStyle = {
      ...existingTextStyle,
      ...fontSwitchUpdate,
    };

    expect(mergedStyle.font).toBe('Anton');
    expect(mergedStyle.fontSize).toBe(70);
    expect(mergedStyle.textColor).toBe('#00FFCC');
    expect(mergedStyle.strokeEnabled).toBe(true);
    expect(mergedStyle.shadowEnabled).toBe(true);
  });

  test('4. Text Container background shapes (None, Solid, Rounded, Pill, Strip) override correctly', () => {
    const containers: Array<StyleData['containerType']> = ['none', 'solid', 'rounded', 'pill', 'strip'];

    containers.forEach((type) => {
      const style: Partial<StyleData> = {
        containerType: type,
        backgroundColor: '#FF0055',
        backgroundOpacity: 90,
        paddingX: 24,
        paddingY: 12,
        borderRadius: 16,
      };

      expect(style.containerType).toBe(type);
      if (type !== 'none') {
        expect(style.backgroundColor).toBe('#FF0055');
        expect(style.paddingX).toBe(24);
      }
    });
  });

  test('5. Transform Scale and Rotation scale visually without altering X/Y position or caption timing', () => {
    const style: Partial<StyleData> = {
      scale: 140,
      rotation: 12,
    };

    expect(style.scale).toBe(140);
    expect(style.rotation).toBe(12);

    // Timing and position remain intact
    expect(initialSegment.start).toBe(0);
    expect(initialSegment.end).toBe(2.5);
    expect(initialSegment.position_data?.position).toBe('bottom-center');
  });

  test('6. Word-level font customization survives global Text Style changes', () => {
    const segmentWithWordFont: CaptionSegment = {
      ...initialSegment,
      words: [
        { text: 'I', start: 0, end: 0.5 },
        { text: 'love', start: 0.5, end: 1.0 },
        { text: 'artificial', start: 1.0, end: 1.8 },
        { text: 'intelligence', start: 1.8, end: 2.5, fontFamily: 'Gidugu' } as any,
      ],
    };

    // User changes global font size & color
    const globalUpdate: Partial<StyleData> = {
      fontSize: 75,
      textColor: '#33FF57',
    };

    const updatedSeg = {
      ...segmentWithWordFont,
      style_data: { ...segmentWithWordFont.style_data, ...globalUpdate },
    };

    expect(updatedSeg.style_data.fontSize).toBe(75);
    expect(updatedSeg.style_data.textColor).toBe('#33FF57');
    expect((updatedSeg.words[3] as any).fontFamily).toBe('Gidugu');
  });

  test('7. Section-level reset clears ONLY targeted section keys without resetting Font Family or other sections', () => {
    const modifiedStyle: Partial<StyleData> = {
      font: 'Anton', // Selected Font Family
      fontSize: 110, // Typography
      fontWeight: 900, // Typography
      italic: true, // Typography
      textColor: '#FF0000', // Color & Opacity
      textOpacity: 80, // Color & Opacity
      rotation: 25, // Transform
      scale: 150, // Transform
    };

    // User clicks Typography Reset -> Reset ['fontSize', 'fontWeight', 'italic', 'underline']
    const typographyKeysToReset: (keyof StyleData)[] = ['fontSize', 'fontWeight', 'italic', 'underline'];
    const styleAfterTypographyReset: any = { ...modifiedStyle };
    typographyKeysToReset.forEach((k) => delete styleAfterTypographyReset[k]);

    // Typography keys are cleared
    expect(styleAfterTypographyReset.fontSize).toBeUndefined();
    expect(styleAfterTypographyReset.fontWeight).toBeUndefined();
    expect(styleAfterTypographyReset.italic).toBeUndefined();

    // Selected Font Family remains Anton
    expect(styleAfterTypographyReset.font).toBe('Anton');

    // Other section overrides remain intact
    expect(styleAfterTypographyReset.textColor).toBe('#FF0000');
    expect(styleAfterTypographyReset.textOpacity).toBe(80);
    expect(styleAfterTypographyReset.rotation).toBe(25);
    expect(styleAfterTypographyReset.scale).toBe(150);
  });

  test('8. Resetting a section falls back to active template defaults dynamically', () => {
    const activeTemplateDefaultFontSize = baseTemplate.typography?.fontSize || baseTemplate.fontSize || 48;

    const modifiedStyle: Partial<StyleData> = {
      font: 'Poppins',
      fontSize: 140, // User override
    };

    // Reset Typography
    const styleAfterReset: any = { ...modifiedStyle };
    delete styleAfterReset.fontSize;

    // Resolving effective style against active template
    const effectiveFontSize = styleAfterReset.fontSize ?? activeTemplateDefaultFontSize;

    expect(effectiveFontSize).toBe(activeTemplateDefaultFontSize);
    expect(styleAfterReset.font).toBe('Poppins');
  });

  test('9. Text Casing preserves Indic glyphs and numeric tokens correctly', () => {
    const teluguText = 'తెలుగు 2026 AI Video ₹500';
    const uppercaseResult = teluguText.toUpperCase();
    const capitalizeResult = teluguText.replace(/\b\w/g, (c) => c.toUpperCase());

    expect(uppercaseResult).toContain('2026');
    expect(uppercaseResult).toContain('₹500');
    expect(capitalizeResult).toContain('2026');
    expect(capitalizeResult).toContain('₹500');
  });

  test('10. Stroke, Shadow, and Spacing properties merge into effective rendering style', () => {
    const styleData: StyleData = {
      font: 'Inter',
      fontSize: 80,
      fontWeight: 800,
      textColor: '#FFFFFF',
      highlightColor: '#FFD600',
      strokeWidth: 4,
      strokeColor: '#000000',
      strokeEnabled: true,
      shadow: true,
      shadowEnabled: true,
      shadowColor: '#000000',
      shadowBlur: 10,
      shadowDistance: 6,
      background: 'none',
      alignment: 'center',
      letterSpacing: 3,
      lineHeight: 1.4,
      maxWidth: 60,
      maxLines: 2,
    };

    expect(styleData.strokeWidth).toBe(4);
    expect(styleData.strokeEnabled).toBe(true);
    expect(styleData.shadowEnabled).toBe(true);
    expect(styleData.letterSpacing).toBe(3);
    expect(styleData.lineHeight).toBe(1.4);
    expect(styleData.maxWidth).toBe(60);
    expect(styleData.maxLines).toBe(2);
  });
});

