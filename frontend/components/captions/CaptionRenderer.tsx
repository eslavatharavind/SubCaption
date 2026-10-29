'use client';

import React from 'react';
import { TemplateConfig } from '@/types/template';
import { loadFontOnDemand, getFontFamilyWithFallback } from '@/lib/fonts/fontLoader';
import { getContainerAnimationStyles } from '@/lib/animations/animationEngine';
import { AdvancedCaptionRenderer } from './AdvancedCaptionRenderer';


export interface CaptionWordItem {
  text: string;
  start?: number;
  end?: number;
  fontFamily?: string;
  font?: string;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  styleOverrides?: Record<string, any>;
  emphasis?: {
    scale?: number;
    supersizePreset?: number;
    effect?: string;
  };
  highlightBg?: string;
  highlightColor?: string;
  highlightShape?: string;
  isHighlightedTarget?: boolean;
}

export interface CaptionRendererProps {
  words: CaptionWordItem[];
  activeWordIndex: number;
  template: TemplateConfig;
  currentTime?: number;
  typewriterChars?: number;
  frame?: number;
  className?: string;
  scaleMultiplier?: number;
  segmentStart?: number;
  segmentEnd?: number;
  selectedWordIndex?: number | null;
  onSelectWord?: (wordIndex: number) => void;
  onWordPointerDown?: (e: React.PointerEvent<HTMLSpanElement>, wordIndex: number) => void;
}

/**
 * Grapheme-cluster safe string splitter for Unicode-safe character reveals (Telugu, Hindi, English).
 */
export function getGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (s: any) => s.segment);
    } catch {
      // Fallback
    }
  }
  return Array.from(text);
}

/**
 * Safely format text casing (UPPERCASE, lowercase, Capitalize, Normal)
 * without corrupting Indic/Telugu/Hindi glyphs or emojis.
 */
export function applyTextCasing(text: string, casing?: string): string {
  if (!text || !casing || casing === 'normal' || casing === 'none') return text;
  if (casing === 'uppercase') return text.toUpperCase();
  if (casing === 'lowercase') return text.toLowerCase();
  if (casing === 'capitalize') {
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return text;
}

/**
 * Helper to convert Hex/RGB color + Opacity percentage to valid RGBA string.
 */
export function getRgbaColor(
  colorStr: string | undefined,
  opacityPercent: number | undefined,
  defaultColor: string = '#FFFFFF'
): string {
  const opacity = opacityPercent !== undefined ? opacityPercent / 100 : 1.0;
  const col = (colorStr || defaultColor).trim();

  if (col === 'transparent' || col === 'none') return 'transparent';
  if (col.startsWith('rgba')) {
    // Override alpha if explicit opacityPercent given
    if (opacityPercent !== undefined && opacityPercent < 100) {
      return col.replace(/[\d\.]+\)$/g, `${opacity})`);
    }
    return col;
  }
  if (col.startsWith('rgb(')) {
    return col.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }

  let cleanHex = col.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return col;
}

/**
 * Shared Authoritative Caption Renderer Component.
 * Advanced-library templates (opt-in `template.advanced`) use AdvancedCaptionRenderer;
 * every other template renders through the unchanged basic renderer below.
 */
export function CaptionRenderer(props: CaptionRendererProps) {
  if (props.template?.advanced) {
    return <AdvancedCaptionRenderer {...props} />;
  }
  return <BasicCaptionRenderer {...props} />;
}

function BasicCaptionRenderer({
  words,
  activeWordIndex,
  template,
  currentTime,
  typewriterChars,
  frame = 0,
  className = '',
  scaleMultiplier = 1.0,
  segmentStart: explicitStart,
  segmentEnd: explicitEnd,
  selectedWordIndex = null,
  onSelectWord,
  onWordPointerDown,
}: CaptionRendererProps) {
  if (!words || words.length === 0) return null;

  // 1. Extract Container & Background Properties
  const containerType = template.backgroundTreatment || template.container?.type || template.background?.type || 'none';
  const rawBgColor = typeof template.background === 'object'
    ? template.background?.color
    : (template.background !== 'none' ? template.background : undefined);
  const bgColor = rawBgColor || '#000000';
  const bgOpacity = template.background?.opacity !== undefined ? template.background.opacity : 80;
  const effectiveBgColor = getRgbaColor(bgColor, bgOpacity, '#000000');
  const borderRadius = (template.background?.borderRadius ?? template.borderRadius ?? 8) * scaleMultiplier;

  const isContainerNone = containerType === 'none' || containerType === 'transparent' || bgColor === 'none' || bgColor === 'transparent';

  // 2. Extract Typography Properties
  const primaryFont = template.typography?.fontFamily || template.fontFamily || 'Inter';
  const primaryWeight = template.typography?.fontWeight || template.fontWeight || 700;
  const baseFontSize = (template.typography?.fontSize ?? template.fontSize ?? 42) * scaleMultiplier;
  const letterSpacing = (template.typography?.letterSpacing ?? template.letterSpacing ?? 0) * scaleMultiplier;
  const lineHeight = template.typography?.lineHeight ?? template.lineHeight ?? 1.2;
  const textCasing = template.typography?.textCasing || 'none';
  const isItalic = template.typography?.italic ? 'italic' : 'normal';
  const textOpacity = template.typography?.textOpacity ?? 100;

  // 3. Extract Color Properties
  const primaryTextColor = template.colors?.primaryTextColor || template.textColor || '#FFFFFF';
  const highlightColor = template.colors?.highlightColor || template.highlightColor || '#FFD600';
  const effectiveTextColor = getRgbaColor(primaryTextColor, textOpacity, '#FFFFFF');

  // 4. Text Effects & Stroke
  const strokeEnabled = template.stroke?.enabled ?? (template.stroke?.width !== undefined ? template.stroke.width > 0 : (template.strokeWidth ? template.strokeWidth > 0 : false));
  const strokeWidth = (template.stroke?.width ?? template.strokeWidth ?? 0) * scaleMultiplier;
  const strokeColor = template.stroke?.color || template.strokeColor || '#000000';
  const strokeOpacity = template.stroke?.opacity ?? 100;
  const effectiveStrokeColor = getRgbaColor(strokeColor, strokeOpacity, '#000000');

  // 5. Shadow Effects
  const shadowEnabled = template.shadow?.enabled ?? (template.shadow?.blur !== undefined ? template.shadow.blur > 0 : (template.shadowBlur ? template.shadowBlur > 0 : false));
  const shadowColor = template.shadow?.color || template.shadowColor || '#000000';
  const shadowOpacity = template.shadow?.opacity ?? 75;
  const shadowBlur = (template.shadow?.blur ?? template.shadowBlur ?? 8) * scaleMultiplier;
  const shadowDistance = (template.shadow?.distance ?? 4) * scaleMultiplier;
  const shadowAngle = template.shadow?.angle ?? 135;
  const effectiveShadowColor = getRgbaColor(shadowColor, shadowOpacity, 'rgba(0,0,0,0.75)');

  // The editor's Scale slider stores percentages (50-200); templates use ratios (e.g. 1.2).
  const rawTransformScale = template.transform?.scale ?? 1.0;
  const transformScale = rawTransformScale > 10 ? rawTransformScale / 100 : rawTransformScale;
  const transformRotation = template.transform?.rotation ?? 0;

  const glowEnabled = template.glow?.enabled ?? (template.glowColor ? true : false);
  const glowColor = template.glow?.color || template.glowColor || highlightColor;
  const glowIntensity = template.glow?.intensity || 1.8;

  const underline = template.underline || template.typography?.underline || template.highlight?.mode === 'underline';
  const underlineColor = template.underlineColor || template.highlight?.underlineColor || highlightColor;

  let textShadowStyle = 'none';
  if (glowEnabled) {
    const gBlur1 = 8 * glowIntensity * scaleMultiplier;
    const gBlur2 = 18 * glowIntensity * scaleMultiplier;
    textShadowStyle = `0 0 ${gBlur1}px ${glowColor}, 0 0 ${gBlur2}px ${glowColor}`;
  } else if (shadowEnabled) {
    const sRad = (shadowAngle * Math.PI) / 180;
    const sX = Math.round(Math.cos(sRad) * shadowDistance);
    const sY = Math.round(Math.sin(sRad) * shadowDistance);
    textShadowStyle = `${sX}px ${sY}px ${shadowBlur}px ${effectiveShadowColor}`;
  }

  const strokeStyle = strokeEnabled && strokeWidth > 0 ? `${strokeWidth}px ${effectiveStrokeColor}` : 'none';

  const highlightMode = template.highlight?.mode || template.highlightMode || 'active-word';
  const scaleFactor = template.highlight?.scaleFactor || 1.25;

  const entranceAnim = template.animation?.entrance || 'none';
  const wordBehavior = template.animation?.wordAnimation || template.animation?.wordBehavior || template.revealBehavior || 'none';

  // 6. Layout & Alignment
  const textAlignment = template.layout?.textAlignment || 'center';
  const maxCaptionWidth = template.layout?.maxCaptionWidth ?? 90;
  const maxLines = template.layout?.maxLines;

  // 7. Centralized Animation Engine State
  const animConfig: any = template.animation || {};
  const segmentStart = explicitStart !== undefined ? explicitStart : (words[0]?.start ?? 0);
  const segmentEnd = explicitEnd !== undefined ? explicitEnd : (words[words.length - 1]?.end ?? (segmentStart + 2.5));
  const animState = currentTime !== undefined
    ? getContainerAnimationStyles(animConfig, currentTime, segmentStart, segmentEnd)
    : { containerStyle: {}, className: '' };

  // Load fonts dynamically
  React.useEffect(() => {
    if (primaryFont) loadFontOnDemand(primaryFont);
    if (words && words.length > 0) {
      words.forEach((w) => {
        const wf = w.styleOverrides?.fontFamily || w.fontFamily || w.font;
        if (wf) loadFontOnDemand(wf);
      });
    }
  }, [primaryFont, words]);

  // Container Style Generator
  const getContainerStyle = (): React.CSSProperties => {
    const fontStack = getFontFamilyWithFallback(primaryFont);
    const padX = template.background?.containerPaddingX !== undefined ? template.background.containerPaddingX * scaleMultiplier : 14 * scaleMultiplier;
    const padY = template.background?.containerPaddingY !== undefined ? template.background.containerPaddingY * scaleMultiplier : 8 * scaleMultiplier;

    const animTransform = animState.containerStyle.transform || '';
    const baseScaleTransform = transformScale !== 1.0 ? `scale(${transformScale})` : '';
    const baseRotateTransform = transformRotation !== 0 ? `rotate(${transformRotation}deg)` : '';
    const containerTransform = [animTransform, baseScaleTransform, baseRotateTransform].filter(Boolean).join(' ') || undefined;

    const base: React.CSSProperties = {
      fontFamily: fontStack,
      fontSize: `${baseFontSize}px`,
      fontWeight: primaryWeight,
      fontStyle: isItalic,
      color: effectiveTextColor,
      WebkitTextStroke: strokeStyle,
      textShadow: animState.containerStyle.textShadow || textShadowStyle,
      letterSpacing: `${letterSpacing}px`,
      lineHeight: lineHeight,
      textTransform: textCasing as any,
      backgroundColor: 'transparent',
      transform: containerTransform,
      opacity: Math.max(0.9, Number(animState.containerStyle.opacity ?? 1.0)),
      clipPath: animState.containerStyle.clipPath,
      filter: animState.containerStyle.filter,
      width: '100%',
      maxWidth: `${maxCaptionWidth}%`,
      textAlign: textAlignment as any,
      boxSizing: 'border-box',
      transition: 'none',
    };

    if (maxLines && maxLines > 0) {
      (base as any).display = '-webkit-box';
      (base as any).WebkitLineClamp = maxLines;
      (base as any).WebkitBoxOrient = 'vertical';
      (base as any).overflow = 'hidden';
    }

    if (isContainerNone) {
      return base;
    }

    if (containerType === 'strip') {
      return {
        ...base,
        backgroundColor: effectiveBgColor,
        width: '100%',
        padding: `${padY}px ${padX}px`,
        borderRadius: `${borderRadius}px`,
      };
    }
    if (containerType === 'pill') {
      return {
        ...base,
        backgroundColor: effectiveBgColor,
        padding: `${padY}px ${padX}px`,
        borderRadius: '9999px',
      };
    }
    if (containerType === 'solid' || containerType === 'solid-box' || containerType === 'rounded' || containerType === 'semi-transparent') {
      return {
        ...base,
        backgroundColor: effectiveBgColor,
        borderRadius: `${borderRadius}px`,
        padding: `${padY}px ${padX}px`,
      };
    }

    return base;
  };

  // Render Individual Word Item
  const renderWord = (w: CaptionWordItem, idx: number, customScale: number = 1.0) => {
    const isWordActive = activeWordIndex === idx;
    const isHighlightedTarget = w.isHighlightedTarget || false;

    if (wordBehavior === 'word-by-word') {
      if (currentTime !== undefined && w.start !== undefined && currentTime < w.start) {
        return null;
      }
      if (currentTime === undefined && idx > activeWordIndex) {
        return null;
      }
    }

    const isKaraoke = (highlightMode === 'active-word' || highlightMode === 'karaoke' || wordBehavior === 'karaoke') && highlightMode !== 'none';

    // Word-level Style Overrides
    const ov = w.styleOverrides || {};

    // Text Opacity applies to regular word text; highlighted words below stay fully opaque.
    let color = getRgbaColor(ov.textColor || w.color || primaryTextColor, textOpacity, '#FFFFFF');
    if ((isWordActive && isKaraoke) || isHighlightedTarget) {
      color = getRgbaColor(ov.textColor || w.highlightColor || highlightColor, 100, '#FFD600');
    }

    let bg = 'transparent';
    let padding = '0px';
    let radius = '0px';

    const isTargetHighlighted = (isWordActive && isKaraoke) || isHighlightedTarget;
    const shape = isTargetHighlighted ? (ov.containerType || w.highlightShape) : 'none';

    if (shape && shape !== 'none') {
      if (shape === 'marker') {
        bg = getRgbaColor(ov.backgroundColor || '#FEF08A', ov.backgroundOpacity ?? 90, '#FEF08A');
        color = ov.textColor || '#0F172A';
        padding = `${Math.round(2 * scaleMultiplier)}px ${Math.round(6 * scaleMultiplier)}px`;
        radius = `${(ov.borderRadius ?? 4) * scaleMultiplier}px`;
      } else if (shape === 'pill') {
        bg = getRgbaColor(ov.backgroundColor || w.highlightBg || highlightColor, ov.backgroundOpacity ?? 100, highlightColor);
        color = ov.textColor || (bg === '#FFFFFF' || bg === '#FFD600' || bg === '#FEF08A' ? '#000000' : '#FFFFFF');
        padding = `${Math.round(2 * scaleMultiplier)}px ${Math.round(8 * scaleMultiplier)}px`;
        radius = '9999px';
      } else if (shape === 'solid' || shape === 'solid-box' || shape === 'rounded') {
        bg = getRgbaColor(ov.backgroundColor || w.highlightBg || '#DC2626', ov.backgroundOpacity ?? 100, '#DC2626');
        color = ov.textColor || '#FFFFFF';
        padding = `${Math.round(2 * scaleMultiplier)}px ${Math.round(6 * scaleMultiplier)}px`;
        radius = `${(ov.borderRadius ?? 6) * scaleMultiplier}px`;
      }
    } else if (ov.backgroundColor || (isTargetHighlighted && w.highlightBg)) {
      bg = ov.backgroundColor || (isTargetHighlighted ? w.highlightBg : undefined) || 'transparent';
      padding = ov.paddingX !== undefined ? `${(ov.paddingY ?? 2) * scaleMultiplier}px ${(ov.paddingX) * scaleMultiplier}px` : `${Math.round(2 * scaleMultiplier)}px ${Math.round(6 * scaleMultiplier)}px`;
      radius = ov.borderRadius !== undefined ? `${ov.borderRadius * scaleMultiplier}px` : `${Math.round(4 * scaleMultiplier)}px`;
    }

    // Scale resolution (handle percentage e.g. 120 vs ratio 1.2)
    let rawScale = ov.scale !== undefined ? (ov.scale > 10 ? ov.scale / 100 : ov.scale) : 1.0;
    let scale = rawScale * (w.emphasis?.scale ?? 1.0) * customScale;

    if (w.emphasis?.supersizePreset && w.emphasis.supersizePreset > 100) {
      scale *= w.emphasis.supersizePreset / 100;
    }

    let rotate = 0;

    if (isKaraoke && isWordActive && highlightMode !== 'none') {
      if (!ov.scale) scale *= 1.08;
    } else if (isHighlightedTarget && highlightMode !== 'none') {
      if (!ov.scale) scale *= Math.min(1.12, scaleFactor);
    }

    // Font & Weight & Size overrides
    const wordFontFamily = ov.fontFamily || w.fontFamily || w.font || primaryFont;
    const rawWordFontSize = ov.fontSize || (w.styleOverrides as any)?.fontSize || (w as any).fontSize;
    const wordFontSize = rawWordFontSize !== undefined ? rawWordFontSize * scaleMultiplier : baseFontSize;

    const wordFontWeight = ov.fontWeight || w.fontWeight || (isWordActive || isHighlightedTarget ? (primaryWeight >= 700 ? primaryWeight : 700) : primaryWeight);
    const wordFontItalic = ov.italic !== undefined ? (ov.italic ? 'italic' : 'normal') : (w.italic ? 'italic' : isItalic);
    const wordFontUnderline = ov.underline !== undefined ? ov.underline : (w.underline !== undefined ? w.underline : underline);
    const wordFontStack = getFontFamilyWithFallback(wordFontFamily);

    if (wordFontFamily) {
      loadFontOnDemand(wordFontFamily);
    }

    // Emphasis Effects (Deterministic inline styles, no infinite CSS animations)
    const effect = w.emphasis?.effect || template.highlight?.effect || animConfig.emphasisAnimation || 'none';
    let filterStyle = undefined;

    if ((isWordActive || isHighlightedTarget) && (effect === 'pop' || effect === 'bounce' || effect === 'pulse')) {
      scale *= 1.05;
    } else if (effect === 'shake' || effect === 'wobble') {
      if (isWordActive || isHighlightedTarget) {
        rotate = idx % 2 === 0 ? -3 : 3;
      }
    } else if (effect === 'scale-in') {
      scale *= isWordActive || isHighlightedTarget ? 1.08 : 0.96;
    } else if (effect === 'blur-sharp') {
      filterStyle = isWordActive || isHighlightedTarget ? 'blur(0px)' : 'blur(1.5px)';
    }

    // Stroke & Glow/Shadow
    let wordTextShadow = undefined;
    if (ov.glowEnabled || effect === 'glow-pulse') {
      const gCol = ov.glowColor || w.highlightColor || highlightColor || '#00FFFF';
      const gInt = ov.glowIntensity || 1.8;
      wordTextShadow = `0 0 ${8 * gInt * scaleMultiplier}px ${gCol}, 0 0 ${18 * gInt * scaleMultiplier}px ${gCol}`;
    } else if (ov.shadowEnabled || shadowEnabled) {
      const sCol = ov.shadowColor || shadowColor || '#000000';
      const sOpacity = ov.shadowOpacity !== undefined ? ov.shadowOpacity : shadowOpacity;
      const sDist = ov.shadowDistance !== undefined ? ov.shadowDistance * scaleMultiplier : shadowDistance;
      const sBlur = ov.shadowBlur !== undefined ? ov.shadowBlur * scaleMultiplier : shadowBlur;
      const effectiveSCol = getRgbaColor(sCol, sOpacity, 'rgba(0,0,0,0.75)');
      wordTextShadow = `${sDist}px ${sDist}px ${sBlur}px ${effectiveSCol}`;
    }

    let wordStroke = undefined;
    const strokeW = ov.strokeWidth !== undefined ? ov.strokeWidth * scaleMultiplier : (ov.strokeEnabled ? 2 * scaleMultiplier : (strokeEnabled ? strokeWidth : 0));
    if (strokeW > 0) {
      const sOpacity = ov.strokeOpacity !== undefined ? ov.strokeOpacity : strokeOpacity;
      const sCol = getRgbaColor(ov.strokeColor || strokeColor || '#000000', sOpacity, '#000000');
      wordStroke = `${strokeW}px ${sCol}`;
    }

    const formattedWordText = applyTextCasing(w.text, textCasing);
    const charAnim = animConfig.characterAnimation || 'none';

    return (
      <span
        key={idx}
        onClick={onSelectWord ? (e) => { e.stopPropagation(); onSelectWord(idx); } : undefined}
        onPointerDown={onWordPointerDown ? (e) => onWordPointerDown(e, idx) : undefined}
        className={`inline-block relative ${
          selectedWordIndex === idx ? 'outline outline-2 outline-amber-400 rounded px-0.5' : ''
        }`}
        style={{
          color: color,
          backgroundColor: bg,
          padding,
          borderRadius: radius,
          opacity: 1.0,
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          transformOrigin: 'center center',
          transition: 'none',
          fontFamily: wordFontStack,
          fontSize: `${wordFontSize}px`,
          fontWeight: wordFontWeight,
          fontStyle: wordFontItalic,
          textDecoration: wordFontUnderline ? 'underline' : 'none',
          textUnderlineOffset: `${Math.round(4 * scaleMultiplier)}px`,
          letterSpacing: `${letterSpacing}px`,
          WebkitTextStroke: wordStroke,
          textShadow: wordTextShadow,
          filter: filterStyle,
          cursor: selectedWordIndex === idx ? 'grab' : undefined,
        }}
      >
        {charAnim !== 'none' ? (
          getGraphemes(formattedWordText).map((grapheme, cIdx) => {
            const charDelay = (idx * 0.1) + (cIdx * (animConfig.stagger || 0.03));
            const charProgress = currentTime !== undefined
              ? Math.max(0, Math.min(1.0, (currentTime - segmentStart - charDelay) / 0.2))
              : 1.0;
            let cOpacity = Math.max(0.8, charProgress);
            let cScale = charAnim === 'char-pop' || charAnim === 'char-bounce' ? 0.85 + charProgress * 0.15 : 1.0;
            return (
              <span
                key={cIdx}
                className="inline-block align-baseline"
                style={{
                  opacity: cOpacity,
                  transform: cScale !== 1.0 ? `scale(${cScale})` : undefined,
                  transition: 'none',
                }}
              >
                {grapheme}
              </span>
            );
          })
        ) : (
          formattedWordText
        )}
        {(shape === 'underline') && (isWordActive || isHighlightedTarget) && (
          <span
            className="absolute left-0 -bottom-1 w-full h-[3px] rounded-full"
            style={{ backgroundColor: color || underlineColor }}
          />
        )}
      </span>
    );
  };

  const containerStyle = getContainerStyle();

  // Alignment layout flex classes
  const alignmentFlexClass =
    textAlignment === 'left'
      ? 'justify-start text-left items-start'
      : textAlignment === 'right'
      ? 'justify-end text-right items-end'
      : 'justify-center text-center items-center';

  return (
    <div
      className={`caption-renderer-container flex flex-wrap ${alignmentFlexClass} gap-x-2 gap-y-1 ${className}`}
      style={containerStyle}
    >
      {words.map((w, idx) => (
        <React.Fragment key={idx}>
          {renderWord(w, idx)}
        </React.Fragment>
      ))}
    </div>
  );
}


