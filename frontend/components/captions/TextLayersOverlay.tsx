'use client';

import React, { RefObject, useState } from 'react';
import { TextLayer } from '@/types/caption';
import { TemplateConfig } from '@/types/template';
import { CaptionRenderer, CaptionWordItem } from './CaptionRenderer';
import { resolvePosition, computeSnap } from '@/lib/positionSystem';
import { layerDisplayName } from '@/lib/layers';

interface TextLayersOverlayProps {
  layers: TextLayer[];
  currentTime: number;
  templateConfig: TemplateConfig | null;
  containerRef?: RefObject<HTMLDivElement>;
  scaleMultiplier?: number;
  isExport?: boolean;
  snapEnabled?: boolean;
  selectedLayerId?: string | null;
  /** Resolved z-index per layer id (from computeStack). */
  layerZ?: Record<string, number>;
  onSelectLayer?: (id: string) => void;
  onUpdateLayerPosition?: (id: string, pos: any) => void;
}

/**
 * Renders user text layers independently of the caption track, so they stay visible between captions
 * and in export. Locked layers can be selected but not dragged.
 */
export function TextLayersOverlay({
  layers,
  currentTime,
  templateConfig,
  containerRef,
  scaleMultiplier = 1,
  isExport = false,
  snapEnabled = true,
  selectedLayerId = null,
  layerZ = {},
  onSelectLayer,
  onUpdateLayerPosition,
}: TextLayersOverlayProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [guides, setGuides] = useState({ h: false, v: false });

  const visible = layers.filter((l) => {
    if (l.visible === false) return false;
    if (l.startTime !== undefined && currentTime < l.startTime) return false;
    if (l.endTime !== undefined && currentTime > l.endTime) return false;
    return true;
  });
  if (visible.length === 0) return null;

  const base: TemplateConfig = { ...(templateConfig as TemplateConfig), advanced: undefined };

  return (
    <>
      {!isExport && dragId && guides.v && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary-400 z-30 pointer-events-none shadow-[0_0_8px_#3B82F6]" />}
      {!isExport && dragId && guides.h && <div className="absolute left-0 right-0 top-1/2 h-px bg-primary-400 z-30 pointer-events-none shadow-[0_0_8px_#3B82F6]" />}
      {visible.map((layer) => {
        const pos = resolvePosition(layer.position_data, templateConfig);
        const alignClass = pos.anchorX === 'left' ? 'items-start text-left' : pos.anchorX === 'right' ? 'items-end text-right' : 'items-center text-center';
        const selected = !isExport && selectedLayerId === layer.id;
        const locked = !!layer.locked;
        const sd = layer.style_data || {};
        const layerTemplate: TemplateConfig = {
          ...base,
          fontFamily: sd.font || base.fontFamily,
          fontSize: sd.fontSize ?? base.fontSize,
          fontWeight: sd.fontWeight ?? base.fontWeight,
          textColor: sd.textColor || base.textColor,
          typography: {
            ...(base.typography as any),
            fontFamily: sd.font || base.typography?.fontFamily || base.fontFamily || 'Inter',
            fontSize: sd.fontSize ?? base.typography?.fontSize ?? base.fontSize ?? 42,
            fontWeight: sd.fontWeight ?? base.typography?.fontWeight ?? base.fontWeight ?? 700,
          },
          colors: {
            ...(base.colors as any),
            primaryTextColor: sd.textColor || base.colors?.primaryTextColor || base.textColor || '#FFFFFF',
          },
          stroke: {
            ...(base.stroke || {}),
            enabled: sd.strokeEnabled ?? base.stroke?.enabled,
            width: sd.strokeWidth ?? base.stroke?.width,
            color: sd.strokeColor || base.stroke?.color,
          },
          shadow: { ...(base.shadow || {}), enabled: sd.shadowEnabled ?? base.shadow?.enabled },
          animation: (layer.animation_data as any) || { entrance: 'none' },
        };
        const words: CaptionWordItem[] = layer.text.split(' ').filter(Boolean).map((w) => ({ text: w, start: layer.startTime, end: layer.endTime }));
        const scale = layer.scale && layer.scale !== 1 ? ` scale(${layer.scale})` : '';

        const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
          e.stopPropagation();
          e.preventDefault();
          onSelectLayer?.(layer.id);
          if (locked) return;
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {}
          setDragId(layer.id);
        };
        const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
          if (dragId !== layer.id || locked || !containerRef?.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const snap = computeSnap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, snapEnabled);
          setGuides({ h: snap.guides.centerH, v: snap.guides.centerV });
          onUpdateLayerPosition?.(layer.id, {
            x: snap.x,
            y: snap.y,
            anchorX: snap.x < 0.35 ? 'left' : snap.x > 0.65 ? 'right' : 'center',
            anchorY: snap.y < 0.35 ? 'top' : snap.y > 0.65 ? 'bottom' : 'center',
          });
        };
        const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
          if (dragId !== layer.id) return;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {}
          setDragId(null);
          setGuides({ h: false, v: false });
        };

        return (
          <div
            key={`text-layer-${layer.id}`}
            data-layer-id={layer.id}
            data-layer-name={layerDisplayName(layer)}
            data-layering={layer.layering ?? 'front'}
            onPointerDown={isExport ? undefined : onDown}
            onPointerMove={isExport ? undefined : onMove}
            onPointerUp={isExport ? undefined : onUp}
            onPointerCancel={isExport ? undefined : onUp}
            className={
              isExport
                ? `absolute max-w-[95%] flex flex-col ${alignClass} pointer-events-none select-none`
                : `absolute max-w-[95%] flex flex-col ${alignClass} ${locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} touch-none select-none p-1.5 rounded-xl border border-dashed transition-[border-color,box-shadow] ${
                    selected ? 'ring-2 ring-primary-500/80 border-primary-400 bg-primary-950/20 shadow-lg' : 'border-transparent hover:border-primary-400/40'
                  }`
            }
            style={{
              zIndex: layerZ[layer.id] ?? layer.zIndex ?? 10,
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: `${pos.transform || ''}${scale}`.trim() || undefined,
              opacity: layer.opacity ?? 1,
            }}
          >
            <CaptionRenderer
              words={words}
              activeWordIndex={-1}
              template={layerTemplate}
              currentTime={currentTime}
              scaleMultiplier={scaleMultiplier}
              segmentStart={layer.startTime}
              segmentEnd={layer.endTime}
            />
          </div>
        );
      })}
    </>
  );
}
