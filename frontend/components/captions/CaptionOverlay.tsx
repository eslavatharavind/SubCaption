import React, { useState } from 'react';
import { CaptionSegment, CaptionWord, PositionData } from '@/types/caption';
import { TemplateConfig } from '@/types/template';
import { CaptionRenderer, CaptionWordItem } from './CaptionRenderer';
import { resolvePosition, computeSnap, SAFE_ZONES } from '@/lib/positionSystem';

export const SHOW_CAPTION_DEBUG = false;

export interface CaptionOverlayProps {
  activeSegment: CaptionSegment | null;
  currentTime: number;
  highlightEnabled?: boolean;
  templateConfig?: TemplateConfig | null;
  onUpdatePosition?: (pos: Partial<PositionData>) => void;
  onUpdateWordPosition?: (
    target: {
      segmentId: string;
      wordIndex: number;
      wordId?: string;
      phraseStartIndex?: number;
      phraseEndIndex?: number;
    },
    pos: Partial<PositionData>
  ) => void;
  selectedWordIndex?: number | null;
  selectedPhraseRange?: { startIndex: number; endIndex: number } | null;
  onSelectWord?: (segmentId: string, wordIndex: number, word: CaptionWord) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  showSafeAreas?: boolean;
  snapEnabled?: boolean;
  debugMode?: boolean;
  /** Caption layer controls (Layers panel). */
  captionVisible?: boolean;
  captionLocked?: boolean;
  /** Resolved CSS z-index for the caption track. */
  captionZ?: number;
  scaleMultiplier?: number;
  isExport?: boolean;
}

export function CaptionOverlay({
  activeSegment,
  currentTime,
  highlightEnabled = true,
  templateConfig,
  onUpdatePosition,
  onUpdateWordPosition,
  selectedWordIndex = null,
  selectedPhraseRange = null,
  onSelectWord,
  containerRef,
  showSafeAreas = true,
  snapEnabled = true,
  debugMode = SHOW_CAPTION_DEBUG,
  captionVisible = true,
  captionLocked = false,
  captionZ = 20,
  scaleMultiplier = 1.0,
  isExport = false,
}: CaptionOverlayProps) {
  // Dragging state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'base' | 'word' | 'phrase';
    targetWordIndex?: number;
    phraseStartIndex?: number;
    phraseEndIndex?: number;
  }>({ isDragging: false, dragType: 'base' });

  // Snap guides overlay state
  const [guides, setGuides] = useState<{
    centerH: boolean;
    centerV: boolean;
    topSafe: boolean;
    bottomSafe: boolean;
    leftSafe: boolean;
    rightSafe: boolean;
  }>({
    centerH: false,
    centerV: false,
    topSafe: false,
    bottomSafe: false,
    leftSafe: false,
    rightSafe: false,
  });

  if (!activeSegment || !activeSegment.text) return null;

  // Segment Lifespan Check: Do not render segment text outside its playback timestamp window
  const isTimeInSegment =
    currentTime >= activeSegment.start - 0.05 && currentTime <= activeSegment.end + 0.05;
  if (!isTimeInSegment) {
    return null;
  }

  // Parse raw words synchronized with authoritative segment text
  const textWords = activeSegment.text.trim().split(/\s+/).filter(Boolean);
  let rawWords: CaptionWord[] = [];
  if (activeSegment.words && activeSegment.words.length === textWords.length) {
    rawWords = activeSegment.words.map((w, i) => ({
      ...w,
      text: textWords[i] ?? w.text,
    }));
  } else if (activeSegment.words && activeSegment.words.length > 0) {
    const duration = Math.max(0.1, activeSegment.end - activeSegment.start);
    const step = duration / Math.max(1, textWords.length);
    rawWords = textWords.map((token, i) => {
      const existing = activeSegment.words[i];
      return {
        ...(existing || {}),
        text: token,
        start: existing?.start ?? (activeSegment.start + i * step),
        end: existing?.end ?? (activeSegment.start + (i + 1) * step),
      };
    });
  } else {
    rawWords = textWords.map((w) => ({
      text: w,
      start: activeSegment.start,
      end: activeSegment.end,
    }));
  }

  // Resolve Highlight configuration
  const highlightData = activeSegment.highlight_data || { mode: 'active-word' };
  const currentMode = highlightEnabled ? highlightData.mode || 'active-word' : 'none';
  const globalHighlightColor =
    highlightData.color || activeSegment.style_data?.highlightColor || '#FFD600';
  const globalHighlightBg = highlightData.backgroundColor;
  const globalHighlightShape = highlightData.shape;
  const globalScale = highlightData.scale || 100;
  const globalEffect = highlightData.effect || 'none';
  const globalTimingMode = highlightData.timingMode || 'while-spoken';

  // Calculate active word index dynamically based on playback currentTime
  let activeWordIndex = -1;
  if (currentMode !== 'none' && rawWords.length > 0 && isTimeInSegment) {
    activeWordIndex = rawWords.findIndex(
      (w) =>
        w.start !== undefined &&
        w.end !== undefined &&
        currentTime >= w.start &&
        currentTime <= w.end
    );
  }

  // Map all raw words to styled CaptionWordItem
  const styledWordItems: CaptionWordItem[] = rawWords.map((w: CaptionWord, idx: number) => {
    const target = (highlightData.targets || []).find(
      (t) => t.wordIndex === idx || (t.wordId && t.wordId === w.id)
    );

    const timingMode = target?.timing?.mode || globalTimingMode;
    let isTargetActive = false;

    if (currentMode === 'none') {
      isTargetActive = false;
    } else if (currentMode === 'keyword' || currentMode === 'phrase') {
      if (target) {
        if (timingMode === 'persistent') {
          isTargetActive = currentTime >= (w.start ?? activeSegment.start);
        } else if (timingMode === 'custom') {
          const cStart = target.timing?.start ?? w.start ?? activeSegment.start;
          const cEnd = target.timing?.end ?? w.end ?? activeSegment.end;
          isTargetActive = currentTime >= cStart && currentTime <= cEnd;
        } else {
          isTargetActive = true;
        }
      }
    } else if (currentMode === 'active-word' || currentMode === 'karaoke') {
      isTargetActive = activeWordIndex === idx || Boolean(target);
      if (target && timingMode === 'persistent') {
        isTargetActive = currentTime >= (w.start ?? activeSegment.start);
      } else if (target && timingMode === 'custom') {
        const cStart = target.timing?.start ?? w.start ?? activeSegment.start;
        const cEnd = target.timing?.end ?? w.end ?? activeSegment.end;
        isTargetActive = currentTime >= cStart && currentTime <= cEnd;
      }
    }

    const resolvedColor =
      target?.styleOverrides?.textColor || (isTargetActive ? globalHighlightColor : w.color);
    const resolvedFont = target?.styleOverrides?.fontFamily || w.fontFamily || w.font;
    const resolvedWeight = target?.styleOverrides?.fontWeight || w.fontWeight;
    const resolvedBg =
      target?.styleOverrides?.backgroundColor || (isTargetActive ? (globalHighlightBg || w.highlightBg) : undefined);
    const resolvedShape =
      target?.styleOverrides?.containerType || (isTargetActive ? (globalHighlightShape || w.highlightShape) : undefined);
    const resolvedHighlightColor =
      target?.styleOverrides?.textColor || globalHighlightColor || w.highlightColor;

    const mergedOverrides = {
      ...(w.styleOverrides || {}),
      ...(target?.styleOverrides || {}),
      ...(globalScale !== 100 && !target?.styleOverrides?.scale ? { scale: globalScale } : {}),
    };

    const mergedEmphasis = {
      ...(w.emphasis || {}),
      ...(target?.emphasis || {}),
      ...(globalEffect !== 'none' && !target?.emphasis?.effect ? { effect: globalEffect } : {}),
    };

    return {
      text: w.text,
      start: w.start,
      end: w.end,
      fontFamily: resolvedFont,
      fontWeight: resolvedWeight,
      italic:
        target?.styleOverrides?.italic !== undefined
          ? target.styleOverrides.italic
          : (w as any).italic,
      underline:
        target?.styleOverrides?.underline !== undefined
          ? target.styleOverrides.underline
          : (w as any).underline,
      color: resolvedColor,
      styleOverrides: mergedOverrides,
      emphasis: mergedEmphasis,
      highlightBg: resolvedBg,
      highlightColor: resolvedHighlightColor,
      highlightShape: resolvedShape,
      isHighlightedTarget: isTargetActive,
    };
  });

  // Base template configuration fallback
  const baseTemplate = templateConfig || {
    id: 'default',
    name: 'Default',
    category: 'Clean',
    description: 'Default template',
    typography: { fontFamily: 'Inter', fontWeight: 700, fontSize: 42 },
    colors: { primaryTextColor: '#FFFFFF', highlightColor: '#FFD600' },
  };

  const sd = activeSegment.style_data || {};

  const effectiveTypography = {
    ...baseTemplate.typography,
    fontFamily:
      sd.font || baseTemplate.typography?.fontFamily || (baseTemplate as any).fontFamily || 'Inter',
    fontSize:
      sd.fontSize ??
      baseTemplate.typography?.fontSize ??
      (baseTemplate as any).fontSize ??
      42,
    fontWeight:
      sd.fontWeight ??
      baseTemplate.typography?.fontWeight ??
      (baseTemplate as any).fontWeight ??
      700,
    italic: sd.italic !== undefined ? sd.italic : baseTemplate.typography?.italic,
    underline: sd.underline !== undefined ? sd.underline : baseTemplate.typography?.underline,
    textOpacity:
      sd.textOpacity !== undefined ? sd.textOpacity : baseTemplate.typography?.textOpacity,
    letterSpacing:
      sd.letterSpacing !== undefined ? sd.letterSpacing : baseTemplate.typography?.letterSpacing,
    lineHeight:
      sd.lineHeight !== undefined ? sd.lineHeight : baseTemplate.typography?.lineHeight,
    textCasing: sd.textCasing || baseTemplate.typography?.textCasing,
  };

  const effectiveColors = {
    ...baseTemplate.colors,
    primaryTextColor:
      sd.textColor ||
      baseTemplate.colors?.primaryTextColor ||
      (baseTemplate as any).textColor ||
      '#FFFFFF',
    highlightColor:
      globalHighlightColor ||
      sd.highlightColor ||
      baseTemplate.colors?.highlightColor ||
      '#FFD600',
  };

  const effectiveStroke = {
    ...baseTemplate.stroke,
    enabled:
      sd.strokeEnabled !== undefined
        ? sd.strokeEnabled
        : sd.strokeWidth !== undefined
        ? sd.strokeWidth > 0
        : baseTemplate.stroke?.enabled,
    width: sd.strokeWidth !== undefined ? sd.strokeWidth : baseTemplate.stroke?.width,
    color: sd.strokeColor || baseTemplate.stroke?.color,
    opacity: sd.strokeOpacity !== undefined ? sd.strokeOpacity : baseTemplate.stroke?.opacity,
  };

  const effectiveShadow = {
    ...baseTemplate.shadow,
    enabled:
      sd.shadowEnabled !== undefined
        ? sd.shadowEnabled
        : sd.shadow !== undefined
        ? sd.shadow
        : baseTemplate.shadow?.enabled,
    color: sd.shadowColor || baseTemplate.shadow?.color,
    opacity: sd.shadowOpacity !== undefined ? sd.shadowOpacity : baseTemplate.shadow?.opacity,
    blur: sd.shadowBlur !== undefined ? sd.shadowBlur : baseTemplate.shadow?.blur,
    distance: sd.shadowDistance !== undefined ? sd.shadowDistance : baseTemplate.shadow?.distance,
    angle: sd.shadowAngle !== undefined ? sd.shadowAngle : baseTemplate.shadow?.angle,
  };

  const effectiveBackground = {
    ...baseTemplate.background,
    type:
      sd.containerType ||
      baseTemplate.background?.type ||
      (sd.background && sd.background !== 'transparent' && sd.background !== 'none'
        ? 'solid'
        : undefined),
    color: sd.backgroundColor || sd.background || baseTemplate.background?.color,
    opacity:
      sd.backgroundOpacity !== undefined
        ? sd.backgroundOpacity
        : baseTemplate.background?.opacity,
    containerPaddingX:
      sd.paddingX !== undefined ? sd.paddingX : baseTemplate.background?.containerPaddingX,
    containerPaddingY:
      sd.paddingY !== undefined ? sd.paddingY : baseTemplate.background?.containerPaddingY,
    borderRadius:
      sd.borderRadius !== undefined ? sd.borderRadius : baseTemplate.background?.borderRadius,
  };

  const effectiveLayout = {
    ...baseTemplate.layout,
    maxCaptionWidth:
      sd.maxWidth !== undefined ? sd.maxWidth : baseTemplate.layout?.maxCaptionWidth,
    maxLines: sd.maxLines !== undefined ? sd.maxLines : baseTemplate.layout?.maxLines,
    textAlignment: sd.alignment || baseTemplate.layout?.textAlignment || 'center',
  };

  const effectiveTransform = {
    ...baseTemplate.transform,
    scale: sd.scale !== undefined ? sd.scale : baseTemplate.transform?.scale,
    rotation: sd.rotation !== undefined ? sd.rotation : baseTemplate.transform?.rotation,
  };

  const baseAnim =
    typeof baseTemplate.animation === 'object'
      ? baseTemplate.animation
      : { entrance: (baseTemplate as any).animation || 'none' };

  const userAnim = activeSegment.animation_data;
  const hasUserAnim = Boolean(userAnim && Object.keys(userAnim).length > 0);

  let effectiveAnimation: any = {
    ...baseAnim,
    ...(userAnim || {}),
    entrance:
      userAnim?.entrance !== undefined
        ? userAnim.entrance
        : (userAnim as any)?.type !== undefined && (userAnim as any)?.type !== 'none'
        ? (userAnim as any).type
        : (baseAnim.entrance || 'none'),
    wordAnimation: userAnim?.wordAnimation ?? baseAnim.wordAnimation ?? 'none',
    characterAnimation: userAnim?.characterAnimation ?? baseAnim.characterAnimation ?? 'none',
    karaokeAnimation: userAnim?.karaokeAnimation ?? baseAnim.karaokeAnimation ?? 'none',
    emphasisAnimation: userAnim?.emphasisAnimation ?? baseAnim.emphasisAnimation ?? 'none',
    exit: userAnim?.exit ?? baseAnim.exit ?? 'none',
    loop: userAnim?.loop ?? baseAnim.loop ?? 'none',
    advancedMotion: userAnim?.advancedMotion ?? baseAnim.advancedMotion ?? 'none',
    advancedReveal: userAnim?.advancedReveal ?? baseAnim.advancedReveal ?? 'none',
    creativeEffect: userAnim?.creativeEffect ?? baseAnim.creativeEffect ?? 'none',
    duration: userAnim?.duration ?? baseAnim.duration ?? 0.35,
    delay: userAnim?.delay ?? baseAnim.delay ?? 0,
    stagger: userAnim?.stagger ?? baseAnim.stagger ?? 0.05,
    easing: userAnim?.easing ?? baseAnim.easing ?? 'easeOut',
    direction: userAnim?.direction ?? baseAnim.direction ?? 'up',
    intensity: userAnim?.intensity ?? baseAnim.intensity ?? 'medium',
    transform: {
      ...(baseAnim.transform || {}),
      ...(userAnim?.transform || {}),
    },
  };

  // If user explicitly set entrance to 'none'
  if (userAnim?.entrance === 'none' || (userAnim as any)?.type === 'none') {
    effectiveAnimation.entrance = 'none';
  }

  const effectiveTemplate: TemplateConfig = {
    ...baseTemplate,
    fontFamily: effectiveTypography.fontFamily,
    fontSize: effectiveTypography.fontSize,
    fontWeight: effectiveTypography.fontWeight,
    textColor: effectiveColors.primaryTextColor,
    highlightColor: effectiveColors.highlightColor,
    underline: sd.underline !== undefined ? sd.underline : baseTemplate.underline,
    borderRadius: sd.borderRadius !== undefined ? sd.borderRadius : baseTemplate.borderRadius,
    backgroundTreatment: effectiveBackground.type as any,
    typography: effectiveTypography,
    colors: effectiveColors,
    stroke: effectiveStroke,
    shadow: effectiveShadow,
    background: effectiveBackground,
    layout: effectiveLayout,
    transform: effectiveTransform,
    animation: effectiveAnimation as any,
    highlight: {
      ...(baseTemplate.highlight || {}),
      mode: currentMode as any,
      effect: globalEffect as any,
      boxColor: globalHighlightBg,
    },
  };

  // Group Words: Base words vs Overridden Words / Phrases
  interface WordGroup {
    type: 'base' | 'word' | 'phrase';
    words: CaptionWordItem[];
    rawIndices: number[];
    posData?: PositionData;
    wordIndex?: number;
    wordId?: string;
    phraseStartIndex?: number;
    phraseEndIndex?: number;
  }

  const baseWordsList: { item: CaptionWordItem; rawIdx: number }[] = [];
  const overrideGroups: WordGroup[] = [];

  // Inspect words for position overrides
  let currentPhraseGroup: WordGroup | null = null;

  rawWords.forEach((w, idx) => {
    const styled = styledWordItems[idx];
    const hasWordPosOverride = Boolean(
      w.position_data &&
        (w.position_data.custom ||
          (w.position_data.x !== undefined &&
            w.position_data.y !== undefined &&
            (w.position_data.x !== (activeSegment.position_data?.x ?? 0.5) ||
              w.position_data.y !== (activeSegment.position_data?.y ?? 0.88))))
    );

    if (hasWordPosOverride && w.position_data) {
      if (w.phraseGroupId) {
        if (currentPhraseGroup && currentPhraseGroup.posData === w.position_data) {
          currentPhraseGroup.words.push(styled);
          currentPhraseGroup.rawIndices.push(idx);
          currentPhraseGroup.phraseEndIndex = idx;
        } else {
          currentPhraseGroup = {
            type: 'phrase',
            words: [styled],
            rawIndices: [idx],
            posData: w.position_data,
            phraseStartIndex: idx,
            phraseEndIndex: idx,
          };
          overrideGroups.push(currentPhraseGroup);
        }
      } else {
        currentPhraseGroup = null;
        overrideGroups.push({
          type: 'word',
          words: [styled],
          rawIndices: [idx],
          posData: w.position_data,
          wordIndex: idx,
          wordId: w.id,
        });
      }
    } else {
      currentPhraseGroup = null;
      baseWordsList.push({ item: styled, rawIdx: idx });
    }
  });

  const hasWordOverrides = overrideGroups.length > 0;

  // Pointer Drag Handlers (Mouse & Mobile Touch)
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    targetType: 'base' | 'word' | 'phrase',
    groupMeta?: { wordIndex?: number; phraseStartIndex?: number; phraseEndIndex?: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      isDragging: true,
      dragType: targetType,
      targetWordIndex: groupMeta?.wordIndex,
      phraseStartIndex: groupMeta?.phraseStartIndex,
      phraseEndIndex: groupMeta?.phraseEndIndex,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.isDragging || !containerRef?.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;

    const snapResult = computeSnap(rawX, rawY, snapEnabled);

    setGuides(snapResult.guides);

    const anchorX = snapResult.x < 0.35 ? 'left' : snapResult.x > 0.65 ? 'right' : 'center';
    const anchorY = snapResult.y < 0.35 ? 'top' : snapResult.y > 0.65 ? 'bottom' : 'center';

    const newPosData: Partial<PositionData> = {
      x: snapResult.x,
      y: snapResult.y,
      anchorX,
      anchorY,
      custom: true,
    };

    if (dragState.dragType === 'base') {
      if (onUpdatePosition) {
        onUpdatePosition(newPosData);
      }
    } else if (onUpdateWordPosition) {
      onUpdateWordPosition(
        {
          segmentId: activeSegment.id,
          wordIndex: dragState.targetWordIndex ?? 0,
          phraseStartIndex: dragState.phraseStartIndex,
          phraseEndIndex: dragState.phraseEndIndex,
        },
        newPosData
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
      setDragState({ isDragging: false, dragType: 'base' });
      setGuides({
        centerH: false,
        centerV: false,
        topSafe: false,
        bottomSafe: false,
        leftSafe: false,
        rightSafe: false,
      });
    }
  };

  // Base coordinates
  const baseResolved = resolvePosition(activeSegment.position_data, templateConfig);
  const baseAlignClass =
    baseResolved.anchorX === 'left'
      ? 'items-start text-left'
      : baseResolved.anchorX === 'right'
      ? 'items-end text-right'
      : 'items-center text-center';

  return (
    <>
      {/* Visual Alignment Snap Guides Overlay */}
      {!isExport && guides.centerH && (
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-primary-400 z-30 pointer-events-none shadow-[0_0_8px_#3B82F6]" />
      )}
      {!isExport && guides.centerV && (
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-primary-400 z-30 pointer-events-none shadow-[0_0_8px_#3B82F6]" />
      )}
      {!isExport && guides.topSafe && (
        <div
          className="absolute left-0 right-0 h-[1px] bg-amber-400/80 z-30 pointer-events-none border-t border-dashed border-amber-400 shadow-[0_0_6px_#F59E0B]"
          style={{ top: `${SAFE_ZONES.top * 100}%` }}
        />
      )}
      {!isExport && guides.bottomSafe && (
        <div
          className="absolute left-0 right-0 h-[1px] bg-amber-400/80 z-30 pointer-events-none border-t border-dashed border-amber-400 shadow-[0_0_6px_#F59E0B]"
          style={{ top: `${SAFE_ZONES.bottom * 100}%` }}
        />
      )}
      {!isExport && guides.leftSafe && (
        <div
          className="absolute top-0 bottom-0 w-[1px] bg-amber-400/80 z-30 pointer-events-none border-l border-dashed border-amber-400 shadow-[0_0_6px_#F59E0B]"
          style={{ left: `${SAFE_ZONES.left * 100}%` }}
        />
      )}
      {!isExport && guides.rightSafe && (
        <div
          className="absolute top-0 bottom-0 w-[1px] bg-amber-400/80 z-30 pointer-events-none border-r border-dashed border-amber-400 shadow-[0_0_6px_#F59E0B]"
          style={{ left: `${SAFE_ZONES.right * 100}%` }}
        />
      )}

      {/* 1. BASE CAPTION CONTAINER */}
      {captionVisible && (!hasWordOverrides || baseWordsList.length > 0) && (
        <div
          key={`base-${activeSegment.id}`}
          onPointerDown={isExport || captionLocked ? undefined : (e) => handlePointerDown(e, 'base')}
          onPointerMove={isExport ? undefined : handlePointerMove}
          onPointerUp={isExport ? undefined : handlePointerUp}
          onPointerCancel={isExport ? undefined : handlePointerUp}
          className={
            isExport
              ? `absolute max-w-[95%] flex flex-col ${baseAlignClass} pointer-events-none select-none`
              : `absolute max-w-[95%] flex flex-col ${baseAlignClass} ${captionLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} pointer-events-auto touch-none select-none p-1.5 rounded-xl border border-dashed transition-[border-color,box-shadow] duration-150 ${
                  dragState.isDragging && dragState.dragType === 'base'
                    ? 'ring-2 ring-primary-500/80 border-primary-400 shadow-[0_4px_20px_rgba(59,130,246,0.35)] bg-primary-950/20'
                    : 'border-transparent hover:border-primary-400/50 hover:bg-black/10'
                }`
          }
          style={{
            left: `${baseResolved.x * 100}%`,
            top: `${baseResolved.y * 100}%`,
            transform: baseResolved.transform,
            width: `${effectiveLayout.maxCaptionWidth ?? 90}%`,
            zIndex: captionZ,
          }}
        >
          {/* Whole Caption Drag Handle Pill */}
          {!isExport && !captionLocked && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                handlePointerDown(e, 'base');
              }}
              className="absolute -top-4 left-2 px-2 py-0.5 bg-primary-600/95 hover:bg-primary-500 text-[9px] font-mono font-bold text-white rounded-md flex items-center gap-1 shadow-md cursor-grab active:cursor-grabbing pointer-events-auto touch-none select-none transition-all border border-primary-400/50 z-30"
              title="Click and drag to move entire caption segment"
            >
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm1 5h-4v3H3l5 5 5-5h-3v-3zm5-1h3v3l5-5-5-5v3h-3v4z"/>
              </svg>
              <span>Whole Caption</span>
            </div>
          )}

          {/* Debug Selection Badge (only when debugMode is true) */}
          {!isExport && (debugMode ?? SHOW_CAPTION_DEBUG) && (
            <div className="absolute -top-3 right-2 px-1.5 py-0.2 bg-primary-600/90 text-[8px] font-mono font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Caption
            </div>
          )}

          <CaptionRenderer
            words={hasWordOverrides ? baseWordsList.map((b) => b.item) : styledWordItems}
            activeWordIndex={activeWordIndex}
            template={effectiveTemplate}
            currentTime={currentTime}
            scaleMultiplier={scaleMultiplier}
            segmentStart={activeSegment.start}
            segmentEnd={activeSegment.end}
            selectedWordIndex={selectedWordIndex}
            onSelectWord={onSelectWord ? (wIdx) => onSelectWord(activeSegment.id, wIdx, rawWords[wIdx]) : undefined}
            onWordPointerDown={
              isExport
                ? undefined
                : (e, wIdx) => {
                    e.stopPropagation();
                    const actualIdx = hasWordOverrides ? (baseWordsList[wIdx]?.rawIdx ?? wIdx) : wIdx;
                    handlePointerDown(e as any, 'word', { wordIndex: actualIdx });
                  }
            }
          />
        </div>
      )}

      {/* 2. OVERRIDDEN WORD & PHRASE CONTAINERS */}
      {captionVisible && overrideGroups.map((group, gIdx) => {
        const groupResolved = resolvePosition(group.posData, templateConfig);
        const groupAlignClass =
          groupResolved.anchorX === 'left'
            ? 'items-start text-left'
            : groupResolved.anchorX === 'right'
            ? 'items-end text-right'
            : 'items-center text-center';

        const isThisDragging =
          !isExport &&
          dragState.isDragging &&
          ((group.type === 'word' && dragState.targetWordIndex === group.wordIndex) ||
            (group.type === 'phrase' && dragState.phraseStartIndex === group.phraseStartIndex));

        return (
          <div
            key={`override-${group.type}-${gIdx}-${activeSegment.id}`}
            onPointerDown={
              isExport || captionLocked
                ? undefined
                : (e) =>
                    handlePointerDown(e, group.type, {
                      wordIndex: group.wordIndex,
                      phraseStartIndex: group.phraseStartIndex,
                      phraseEndIndex: group.phraseEndIndex,
                    })
            }
            onPointerMove={isExport ? undefined : handlePointerMove}
            onPointerUp={isExport ? undefined : handlePointerUp}
            onPointerCancel={isExport ? undefined : handlePointerUp}
            className={
              isExport
                ? `absolute flex flex-col ${groupAlignClass} pointer-events-none select-none`
                : `absolute flex flex-col ${groupAlignClass} ${captionLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} pointer-events-auto touch-none select-none p-1 rounded-xl border border-dashed transition-[border-color,box-shadow] duration-150 ${
                    isThisDragging
                      ? 'ring-2 ring-amber-500/80 border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.35)] bg-amber-950/20'
                      : 'border-transparent hover:border-amber-400/50 hover:bg-black/10'
                  }`
            }
            style={{
              left: `${groupResolved.x * 100}%`,
              top: `${groupResolved.y * 100}%`,
              transform: groupResolved.transform,
              maxWidth: '90%',
              zIndex: captionZ,
            }}
          >
            {/* Word / Phrase Tag (only when debugMode is true) */}
            {!isExport && (debugMode ?? SHOW_CAPTION_DEBUG) && (
              <div className="absolute -top-3 left-2 px-1 py-0.2 bg-amber-500 text-[8px] font-mono font-bold text-black rounded pointer-events-none">
                {group.type === 'phrase'
                  ? `Phrase (${group.words.map((w) => w.text).join(' ')})`
                  : `Word: ${group.words[0]?.text}`}
              </div>
            )}

            <CaptionRenderer
              words={group.words}
              activeWordIndex={activeWordIndex}
              template={effectiveTemplate}
              currentTime={currentTime}
              scaleMultiplier={scaleMultiplier}
              segmentStart={activeSegment.start}
              segmentEnd={activeSegment.end}
            />
          </div>
        );
      })}
    </>
  );
}
