'use client';

import React, { RefObject, useRef } from 'react';
import { CaptionSegment } from '@/types';

export interface TimelineLayerBar {
  id: string;
  label: string;
  start: number;
  end: number;
  selected: boolean;
  locked: boolean;
  visible: boolean;
  behind: boolean;
}

interface EditorTimelineProps {
  layerBars?: TimelineLayerBar[];
  onSelectLayerBar?: (id: string) => void;
  onUpdateLayerTiming?: (id: string, start: number, end: number) => void;
  segments: CaptionSegment[];
  selectedSegmentId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number; // px per second
  onZoomChange: (z: number) => void;
  scrollRef: RefObject<HTMLDivElement>;
  onSeek: (t: number) => void;
  startSeeking: () => void;
  endSeeking: () => void;
  onTogglePlay: () => void;
  onSelectSegment: (id: string) => void;
  onDeleteSegment: (id: string, e?: React.MouseEvent) => void;
  onUpdateTiming: (id: string, start: number, end: number) => void;
}

export const MIN_ZOOM = 5;
export const MAX_ZOOM = 400;
const LABEL_W = 76;
const LAYER_ROW = 26; // one row per layer so overlapping layers stay individually selectable
const MAX_LAYER_ROWS = 4; // more layers scroll inside the track
const MIN_CLIP = 0.2;

function fmt(t: number, precise = false) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return precise ? `${m}:${s.toFixed(2).padStart(5, '0')}` : `${m}:${Math.floor(s).toString().padStart(2, '0')}`;
}

/** Major tick step (seconds) so labels stay >= ~70px apart at any zoom. */
function tickStep(zoom: number) {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((s) => s * zoom >= 70) ?? 600;
}

type DragMode = 'move' | 'start' | 'end';

export function EditorTimeline({
  segments,
  selectedSegmentId,
  currentTime,
  duration,
  isPlaying,
  zoom,
  onZoomChange,
  scrollRef,
  onSeek,
  startSeeking,
  endSeeking,
  onTogglePlay,
  onSelectSegment,
  onDeleteSegment,
  onUpdateTiming,
  layerBars = [],
  onSelectLayerBar,
  onUpdateLayerTiming,
}: EditorTimelineProps) {
  const hasLayers = layerBars.length > 0;
  const layersH = hasLayers ? Math.min(layerBars.length, MAX_LAYER_ROWS) * LAYER_ROW + 12 : 0;
  const layerDrag = useRef<{ id: string; mode: DragMode; x: number; start: number; end: number; moved: boolean } | null>(null);
  const dur = Math.max(duration || 0, segments.length ? segments[segments.length - 1].end : 0, 1);
  const trackWidth = Math.max(dur * zoom + 120, 600);
  const major = tickStep(zoom);
  const minor = major / 5;
  const drag = useRef<{ id: string; mode: DragMode; x: number; start: number; end: number; moved: boolean } | null>(null);

  const timeAt = (clientX: number) => {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(dur, (clientX - rect.left + el.scrollLeft) / zoom));
  };

  const scrubHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      startSeeking();
      onSeek(timeAt(e.clientX));
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      onSeek(timeAt(e.clientX));
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      endSeeking();
    },
    onPointerCancel: () => endSeeking(),
  };

  const beginClipDrag = (e: React.PointerEvent, seg: CaptionSegment, mode: DragMode) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    drag.current = { id: seg.id, mode, x: e.clientX, start: seg.start, end: seg.end, moved: false };
    onSelectSegment(seg.id);
  };

  const moveClipDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.buttons !== 1) return;
    const dt = (e.clientX - d.x) / zoom;
    if (!d.moved && Math.abs(e.clientX - d.x) < 3) return;
    d.moved = true;
    const idx = segments.findIndex((s) => s.id === d.id);
    const prevEnd = idx > 0 ? segments[idx - 1].end : 0;
    const nextStart = idx < segments.length - 1 ? segments[idx + 1].start : dur;
    let start = d.start;
    let end = d.end;
    if (d.mode === 'move') {
      const len = d.end - d.start;
      start = Math.max(prevEnd, Math.min(nextStart - len, d.start + dt));
      end = start + len;
    } else if (d.mode === 'start') {
      start = Math.max(prevEnd, Math.min(d.end - MIN_CLIP, d.start + dt));
    } else {
      end = Math.min(nextStart, Math.max(d.start + MIN_CLIP, d.end + dt));
    }
    onUpdateTiming(d.id, Math.round(start * 100) / 100, Math.round(end * 100) / 100);
  };

  const endClipDrag = (e: React.PointerEvent, seg: CaptionSegment) => {
    const d = drag.current;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (d && !d.moved && d.mode === 'move') onSeek(seg.start);
  };

  const fit = () => {
    const w = (scrollRef.current?.clientWidth ?? 800) - 40;
    onZoomChange(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(w / dur))));
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };

  const ticks: { t: number; major: boolean }[] = [];
  for (let t = 0; t <= dur + major; t += minor) {
    const rounded = Math.round(t * 1000) / 1000;
    ticks.push({ t: rounded, major: Math.abs(rounded / major - Math.round(rounded / major)) < 1e-6 });
  }

  const btn = 'h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-md text-brand-muted hover:text-white hover:bg-[#1B2129] transition-colors';

  return (
    <div style={hasLayers ? { height: `calc(var(--tl-base) + ${layersH}px)` } : undefined} className={`order-2 lg:order-none ${hasLayers ? '[--tl-base:12rem] lg:[--tl-base:11rem]' : 'h-48 lg:h-44'} bg-[#11151A] border-t border-[#262D36] shrink-0 flex flex-col select-none`}>
      {/* Transport + zoom bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 sm:px-4 py-1.5 border-b border-[#1F252E]">
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => onSeek(Math.max(0, currentTime - 5))} title="Back 5 seconds" aria-label="Back 5 seconds">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" /></svg>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-primary-600 hover:bg-primary-500 text-white transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button type="button" className={btn} onClick={() => onSeek(Math.min(dur, currentTime + 5))} title="Forward 5 seconds" aria-label="Forward 5 seconds">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" /></svg>
          </button>
          <span className="ml-2 font-mono text-[11px] text-white tabular-nums">
            {fmt(currentTime, true)} <span className="text-brand-subtle">/ {fmt(duration || dur, true)}</span>
          </span>
          <span className="ml-2 hidden sm:inline text-[10px] text-brand-subtle">{segments.length} captions</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-brand-subtle">
          <span className="hidden md:inline mr-1">Drag clips to move · drag edges to trim</span>
          <button type="button" className={btn} onClick={() => onZoomChange(Math.max(MIN_ZOOM, Math.round(zoom / 1.25)))} title="Zoom out" aria-label="Zoom out">−</button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-20 sm:w-28 accent-primary-500"
            aria-label="Timeline zoom"
          />
          <button type="button" className={btn} onClick={() => onZoomChange(Math.min(MAX_ZOOM, Math.round(zoom * 1.25)))} title="Zoom in" aria-label="Zoom in">+</button>
          <button type="button" className={`${btn} text-[10px] font-semibold`} onClick={fit} title="Fit whole video">Fit</button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Track labels */}
        <div className="shrink-0 border-r border-[#1F252E] text-[10px] font-semibold uppercase tracking-wider text-brand-subtle" style={{ width: LABEL_W }}>
          <div className="h-6 flex items-center px-2 border-b border-[#1F252E]">Time</div>
          <div style={{ height: `calc(100% - 1.5rem - ${layersH}px)` }} className="flex items-center px-2">Captions</div>
          {hasLayers && <div style={{ height: layersH }} className="flex items-start pt-2 px-2 border-t border-[#1F252E]">Layers</div>}
        </div>

        {/* Scrollable tracks */}
        <div ref={scrollRef} className="relative flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin bg-[#0A0D11]">
          <div className="relative h-full" style={{ width: trackWidth }}>
            {/* Ruler */}
            <div className="relative h-6 border-b border-[#1F252E] cursor-pointer touch-none bg-[#0E1217]" {...scrubHandlers}>
              {ticks.map(({ t, major: isMajor }) => (
                <div key={t} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: t * zoom }}>
                  <div className={`absolute bottom-0 w-px ${isMajor ? 'h-2.5 bg-brand-subtle/70' : 'h-1 bg-brand-subtle/30'}`} />
                  {isMajor && <span className="absolute top-0.5 left-1 text-[9px] font-mono text-brand-subtle whitespace-nowrap">{fmt(t)}</span>}
                </div>
              ))}
            </div>

            {/* Caption track */}
            <div style={{ height: `calc(100% - 1.5rem - ${layersH}px)` }} className="relative cursor-pointer touch-none" {...scrubHandlers}>
              {segments.map((seg) => {
                const left = seg.start * zoom;
                const width = Math.max(14, (seg.end - seg.start) * zoom);
                const selected = seg.id === selectedSegmentId;
                const active = currentTime >= seg.start && currentTime <= seg.end;
                return (
                  <div
                    key={seg.id}
                    onPointerDown={(e) => beginClipDrag(e, seg, 'move')}
                    onPointerMove={moveClipDrag}
                    onPointerUp={(e) => endClipDrag(e, seg)}
                    style={{ left, width }}
                    title={`${fmt(seg.start, true)} – ${fmt(seg.end, true)}\n${seg.text}`}
                    className={`group absolute top-2 bottom-2 rounded-md border overflow-hidden cursor-grab active:cursor-grabbing transition-colors ${
                      selected
                        ? 'bg-primary-600/35 border-primary-400 ring-1 ring-primary-400 z-10'
                        : active
                        ? 'bg-primary-600/20 border-primary-500/60'
                        : 'bg-[#161C24] border-[#2A323D] hover:border-brand-subtle'
                    }`}
                  >
                    <div
                      onPointerDown={(e) => beginClipDrag(e, seg, 'start')}
                      onPointerMove={moveClipDrag}
                      onPointerUp={(e) => endClipDrag(e, seg)}
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/25"
                      title="Drag to change start"
                    />
                    <div
                      onPointerDown={(e) => beginClipDrag(e, seg, 'end')}
                      onPointerMove={moveClipDrag}
                      onPointerUp={(e) => endClipDrag(e, seg)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/25"
                      title="Drag to change end"
                    />
                    <div className="px-2.5 py-1 h-full flex flex-col justify-between pointer-events-none">
                      <span className="text-[11px] font-medium text-white truncate">{seg.text}</span>
                      {width > 70 && (
                        <span className="text-[9px] font-mono text-brand-subtle truncate">
                          {seg.start.toFixed(2)}s – {seg.end.toFixed(2)}s
                        </span>
                      )}
                    </div>
                    {width > 40 && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => onDeleteSegment(seg.id, e)}
                        className={`absolute top-0.5 right-2 px-1 rounded text-[11px] leading-none text-brand-muted hover:text-red-400 hover:bg-black/40 ${
                          selected ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                        }`}
                        title="Delete caption"
                        aria-label="Delete caption"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Layers track */}
            {hasLayers && (
              <div className="border-t border-[#1F252E] bg-[#090C10] overflow-y-auto overflow-x-hidden scrollbar-thin" style={{ height: layersH }} aria-label="Layers track">
                <div className="relative" style={{ height: layerBars.length * LAYER_ROW + 8 }}>
                {layerBars.map((bar, idx) => {
                  const left = bar.start * zoom;
                  const width = Math.max(14, (bar.end - bar.start) * zoom);
                  const begin = (e: React.PointerEvent, mode: DragMode) => {
                    e.stopPropagation();
                    onSelectLayerBar?.(bar.id);
                    if (bar.locked) return;
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {}
                    layerDrag.current = { id: bar.id, mode, x: e.clientX, start: bar.start, end: bar.end, moved: false };
                  };
                  const move = (e: React.PointerEvent) => {
                    const d = layerDrag.current;
                    if (!d || e.buttons !== 1) return;
                    if (!d.moved && Math.abs(e.clientX - d.x) < 3) return;
                    d.moved = true;
                    const dt = (e.clientX - d.x) / zoom;
                    const len = d.end - d.start;
                    let start = d.start;
                    let end = d.end;
                    if (d.mode === 'move') {
                      start = Math.max(0, Math.min(dur - len, d.start + dt));
                      end = start + len;
                    } else if (d.mode === 'start') {
                      start = Math.max(0, Math.min(d.end - MIN_CLIP, d.start + dt));
                    } else {
                      end = Math.min(dur, Math.max(d.start + MIN_CLIP, d.end + dt));
                    }
                    onUpdateLayerTiming?.(d.id, Math.round(start * 100) / 100, Math.round(end * 100) / 100);
                  };
                  const up = (e: React.PointerEvent) => {
                    layerDrag.current = null;
                    try {
                      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                    } catch {}
                  };
                  return (
                    <div
                      key={bar.id}
                      data-layer-bar={bar.id}
                      data-layering={bar.behind ? 'behind' : 'front'}
                      onPointerDown={(e) => begin(e, 'move')}
                      onPointerMove={move}
                      onPointerUp={up}
                      style={{ left, width, top: 4 + idx * LAYER_ROW, height: LAYER_ROW - 4 }}
                      title={`${bar.label}${bar.locked ? ' (locked)' : ''}${bar.visible ? '' : ' (hidden)'}`}
                      className={`absolute rounded-md border overflow-hidden ${bar.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} ${
                        bar.selected ? 'bg-violet-600/35 border-violet-400 ring-1 ring-violet-400 z-10' : 'bg-[#1A1730] border-[#3A3566] hover:border-violet-400/70'
                      } ${bar.visible ? '' : 'opacity-45'}`}
                    >
                      {!bar.locked && (
                        <>
                          <div onPointerDown={(e) => begin(e, 'start')} onPointerMove={move} onPointerUp={up} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/25" title="Drag to change start" />
                          <div onPointerDown={(e) => begin(e, 'end')} onPointerMove={move} onPointerUp={up} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/25" title="Drag to change end" />
                        </>
                      )}
                      <div className="px-2.5 h-full flex items-center gap-1.5 pointer-events-none">
                        <span className="text-[11px] font-medium text-white truncate">{bar.label}</span>
                        {bar.behind && <span className="text-[8px] font-bold uppercase text-violet-300 shrink-0">behind</span>}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {/* Playhead (draggable knob on the ruler) */}
            <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: currentTime * zoom }}>
              <div className="absolute top-0 bottom-0 w-px -ml-px bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <div
                className="absolute top-0 -ml-[7px] w-3.5 h-4 rounded-b-sm bg-red-500 pointer-events-auto cursor-ew-resize touch-none"
                {...scrubHandlers}
                title="Drag to scrub"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
