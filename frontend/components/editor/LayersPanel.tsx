'use client';

import React, { useMemo, useRef, useState } from 'react';
import { CaptionLayerMeta, LayerLayering, TextLayer } from '@/types/caption';
import { FONT_LIBRARY } from '@/constants/fonts';
import { loadFontOnDemand } from '@/lib/fonts/fontLoader';
import { CAPTION_LAYER_ID, LayerEntry, MoveDirection, buildLayerEntries, dropAt, moveInOrder } from '@/lib/layers';
import type { PersonMaskStatus } from '@/hooks/usePersonMask';

export interface LayersPanelProps {
  captionLayer: CaptionLayerMeta;
  textLayers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddText: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorder: (frontToBack: string[]) => void;
  onUpdateText: (id: string, updates: Partial<TextLayer>) => void;
  onSetLayering: (id: string, layering: LayerLayering) => void;
  onGoToTab: (tab: 'templates' | 'fonts' | 'text' | 'highlight' | 'animation' | 'position') => void;
  personMask: { status: PersonMaskStatus; error: string | null; retry: () => void };
}

const iconBtn =
  'h-7 w-7 inline-flex items-center justify-center rounded-md text-brand-subtle hover:text-white hover:bg-[#1B2129] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-subtle transition-colors';
const field = 'w-full bg-[#11151A] border border-[#262D36] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500 disabled:opacity-50';
const label = 'block text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1';

const Eye = ({ off }: { off: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    {off ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 5.6A9.9 9.9 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3.2 4M6.4 6.9C3.9 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 004.2 4.2" />
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);
const Lock = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path strokeLinecap="round" d={on ? 'M8 11V8a4 4 0 018 0v3' : 'M8 11V8a4 4 0 017.5-2'} />
  </svg>
);

export function LayersPanel(props: LayersPanelProps) {
  const { captionLayer, textLayers, selectedId, personMask } = props;
  const entries = useMemo(() => buildLayerEntries(captionLayer, textLayers), [captionLayer, textLayers]);
  const order = useMemo(() => entries.map((e) => e.id), [entries]);
  const selected = entries.find((e) => e.id === selectedId) || null;
  const selectedText = textLayers.find((l) => l.id === selectedId) || null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const startRename = (e: LayerEntry) => {
    setEditingId(e.id);
    setDraft(e.name);
  };
  const commitRename = () => {
    if (editingId && draft.trim()) props.onRename(editingId, draft.trim());
    setEditingId(null);
  };

  const move = (id: string, dir: MoveDirection) => props.onReorder(moveInOrder(order, id, dir));

  const onRowKey = (e: React.KeyboardEvent, entry: LayerEntry) => {
    if (editingId) return;
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      move(entry.id, e.key === 'ArrowUp' ? 'forward' : 'backward');
    } else if (e.key === 'F2') {
      e.preventDefault();
      startRename(entry);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && entry.deletable && !entry.locked) {
      e.preventDefault();
      props.onDelete(entry.id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      props.onSelect(entry.id);
    }
  };

  const dropIndexFor = (clientY: number) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-layer-row]') || []);
    let idx = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) {
        idx = i;
        break;
      }
    }
    return idx;
  };

  const maskLine = () => {
    switch (personMask.status) {
      case 'loading':
        return <p className="text-[11px] text-amber-300 flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-amber-300/30 border-t-amber-300 animate-spin" aria-hidden="true" />Loading person segmentation…</p>;
      case 'ready':
        return <p className="text-[11px] text-emerald-300">Person segmentation active in the preview.</p>;
      case 'error':
        return (
          <div className="text-[11px] text-red-300 space-y-1.5" role="alert">
            <p>Behind Character could not run: {personMask.error}</p>
            <button type="button" onClick={personMask.retry} className="px-2 py-1 rounded-md border border-red-500/40 hover:bg-red-950/40 font-semibold">Retry</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-[#262D36]">
        <div>
          <h3 className="text-sm font-bold text-white">Layers</h3>
          <p className="text-xs text-brand-subtle">Front-most at the top. Drag to reorder.</p>
        </div>
        <button
          type="button"
          onClick={props.onAddText}
          title="Add a text layer"
          className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors"
        >
          + Text layer
        </button>
      </div>

      <div
        ref={listRef}
        role="list"
        aria-label="Layers, front-most first"
        className="space-y-1.5"
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          setDropIndex(dropIndexFor(e.clientY));
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dropIndex !== null) props.onReorder(dropAt(order, dragId, dropIndex));
          setDragId(null);
          setDropIndex(null);
        }}
      >
        {entries.map((entry, i) => {
          const isSel = entry.id === selectedId;
          return (
            <React.Fragment key={entry.id}>
              {dragId && dropIndex === i && <div className="h-0.5 rounded bg-primary-400" aria-hidden="true" />}
              <div
                role="listitem"
                data-layer-row={entry.id}
                tabIndex={0}
                aria-selected={isSel}
                draggable={editingId !== entry.id}
                onDragStart={(e) => {
                  setDragId(entry.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', entry.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropIndex(null);
                }}
                onClick={() => props.onSelect(entry.id)}
                onKeyDown={(e) => onRowKey(e, entry)}
                className={`group flex items-center gap-1.5 pl-1.5 pr-1 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${
                  isSel ? 'bg-primary-600/15 border-primary-500 text-white' : 'bg-[#151A21] border-[#262D36] text-brand-muted hover:border-brand-subtle'
                } ${dragId === entry.id ? 'opacity-40' : ''} ${entry.visible ? '' : 'opacity-60'}`}
              >
                <span className="cursor-grab text-brand-subtle select-none px-0.5" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
                <span className="h-6 w-6 shrink-0 rounded-md bg-[#11151A] border border-[#262D36] inline-flex items-center justify-center text-[10px] font-bold text-primary-300" aria-hidden="true">
                  {entry.kind === 'caption' ? 'CC' : 'T'}
                </span>

                {editingId === entry.id ? (
                  <input
                    autoFocus
                    value={draft}
                    aria-label="Layer name"
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitRename();
                      else if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={commitRename}
                    className="flex-1 min-w-0 bg-[#0B0D10] border border-primary-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 min-w-0 truncate font-semibold text-white"
                    title={`${entry.name} (double-click or F2 to rename)`}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(entry);
                    }}
                  >
                    {entry.name}
                  </span>
                )}

                {entry.layering === 'behind' && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-[9px] font-bold uppercase text-violet-300" title="Behind the person in the preview">
                    Behind
                  </span>
                )}
                <button type="button" className={iconBtn} aria-label={`Rename ${entry.name}`} title="Rename" onClick={(e) => { e.stopPropagation(); startRename(entry); }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.2 5.2l3.6 3.6M16.7 3.7a2.5 2.5 0 113.6 3.6L6.5 21H3v-3.5L16.7 3.7z" /></svg>
                </button>
                <button type="button" className={`${iconBtn} ${entry.locked ? 'text-amber-300' : ''}`} aria-pressed={entry.locked} aria-label={entry.locked ? `Unlock ${entry.name}` : `Lock ${entry.name}`} title={entry.locked ? 'Unlock layer' : 'Lock layer (prevents moving and editing)'} onClick={(e) => { e.stopPropagation(); props.onToggleLock(entry.id); }}>
                  <Lock on={entry.locked} />
                </button>
                <button type="button" className={`${iconBtn} ${entry.visible ? 'text-primary-300' : ''}`} aria-pressed={!entry.visible} aria-label={entry.visible ? `Hide ${entry.name}` : `Show ${entry.name}`} title={entry.visible ? 'Hide layer' : 'Show layer'} onClick={(e) => { e.stopPropagation(); props.onToggleVisible(entry.id); }}>
                  <Eye off={!entry.visible} />
                </button>
                {entry.deletable && (
                  <button type="button" className={`${iconBtn} hover:text-red-400`} disabled={entry.locked} aria-label={`Delete ${entry.name}`} title={entry.locked ? 'Unlock to delete' : 'Delete layer'} onClick={(e) => { e.stopPropagation(); props.onDelete(entry.id); }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></svg>
                  </button>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {dragId && dropIndex === entries.length && <div className="h-0.5 rounded bg-primary-400" aria-hidden="true" />}
      </div>

      {textLayers.length === 0 && (
        <p className="text-[11px] text-brand-subtle border border-dashed border-[#262D36] rounded-xl p-3">
          Only the caption track exists so far. Use <strong className="text-white">+ Text layer</strong> to add titles, labels or call-outs above or behind the person.
        </p>
      )}

      {!selected ? (
        <p className="text-[11px] text-brand-subtle">Select a layer to edit its properties.</p>
      ) : (
        <div className="space-y-4 pt-3 border-t border-[#262D36]" aria-label="Layer properties">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white truncate">{selected.name}</h4>
            <span className="text-[10px] text-brand-subtle shrink-0">{selected.kind === 'caption' ? 'Caption track' : 'Text layer'}</span>
          </div>

          {selected.locked && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5" role="status">
              This layer is locked. Unlock it to move or edit it.
            </p>
          )}

          {/* Layering */}
          <div className="space-y-2">
            <span className={label}>Layering</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#11151A] border border-[#262D36] rounded-xl" role="radiogroup" aria-label="Layering">
              {([
                ['front', 'Front'],
                ['behind', 'Behind character'],
              ] as const).map(([id, text]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected.layering === id}
                  disabled={selected.locked}
                  onClick={() => props.onSetLayering(selected.id, id)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 ${selected.layering === id ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-white'}`}
                >
                  {text}
                </button>
              ))}
            </div>
            {selected.layering === 'behind' && (
              <div className="space-y-1.5">
                {maskLine()}
                <p className="text-[10px] text-brand-subtle">
                  Preview only: the exported video currently places this layer in front of the person.
                </p>
              </div>
            )}
          </div>

          {/* Stacking order (keyboard / click alternative to dragging) */}
          <div className="space-y-1.5">
            <span className={label}>Order</span>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                ['front', 'To front'],
                ['forward', 'Forward'],
                ['backward', 'Backward'],
                ['back', 'To back'],
              ] as const).map(([dir, text]) => (
                <button key={dir} type="button" onClick={() => move(selected.id, dir)} className="py-1.5 rounded-lg border border-[#262D36] bg-[#151A21] hover:border-primary-500 text-[10px] font-semibold text-white transition-colors">
                  {text}
                </button>
              ))}
            </div>
          </div>

          {selected.kind === 'caption' && (
            <div className="space-y-2">
              <p className="text-[11px] text-brand-subtle">Caption appearance is edited in the other tools, applied to this layer:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['templates', 'Templates'],
                  ['fonts', 'Fonts'],
                  ['text', 'Text Style'],
                  ['highlight', 'Highlight'],
                  ['animation', 'Animation'],
                  ['position', 'Position'],
                ] as const).map(([tab, text]) => (
                  <button key={tab} type="button" onClick={() => props.onGoToTab(tab)} className="py-1.5 rounded-lg border border-[#262D36] bg-[#151A21] hover:border-primary-500 text-[10px] font-semibold text-white transition-colors">
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedText && <TextLayerInspector layer={selectedText} locked={selected.locked} onUpdate={(u) => props.onUpdateText(selectedText.id, u)} />}
        </div>
      )}
    </div>
  );
}

function TextLayerInspector({ layer, locked, onUpdate }: { layer: TextLayer; locked: boolean; onUpdate: (u: Partial<TextLayer>) => void }) {
  const sd = layer.style_data || {};
  const pos = layer.position_data || {};
  const setStyle = (u: Record<string, any>) => onUpdate({ style_data: { ...sd, ...u } });
  const setPos = (u: Record<string, any>) => onUpdate({ position_data: { ...pos, ...u, custom: true } as any });
  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  // The library can list a family more than once; keep one option per family so keys stay unique.
  const fontOptions = useMemo(() => {
    const byFamily = new Map<string, { family: string; name: string }>();
    FONT_LIBRARY.forEach((f) => {
      if (!byFamily.has(f.family)) byFamily.set(f.family, { family: f.family, name: f.name });
    });
    return Array.from(byFamily.values());
  }, []);
  const fontValue = sd.font || 'Inter';

  return (
    <fieldset disabled={locked} className="space-y-3.5 disabled:opacity-60 min-w-0">
      <div>
        <label className={label} htmlFor="layer-text">Text</label>
        <textarea id="layer-text" rows={2} value={layer.text} onChange={(e) => onUpdate({ text: e.target.value })} className={`${field} resize-none`} />
      </div>

      <div>
        <label className={label} htmlFor="layer-font">Font</label>
        <select
          id="layer-font"
          value={fontValue}
          onChange={(e) => {
            loadFontOnDemand(e.target.value);
            setStyle({ font: e.target.value });
          }}
          className={field}
        >
          {!fontOptions.some((f) => f.family === fontValue) && <option value={fontValue}>{fontValue}</option>}
          {fontOptions.map((f) => (
            <option key={f.family} value={f.family}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="layer-size">Font size</label>
          <input id="layer-size" type="number" min={12} max={160} value={sd.fontSize ?? 48} onChange={(e) => setStyle({ fontSize: num(e.target.value, 12, 160, 48) })} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="layer-weight">Weight</label>
          <select id="layer-weight" value={sd.fontWeight ?? 700} onChange={(e) => setStyle({ fontWeight: Number(e.target.value) })} className={field}>
            {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="layer-color">Color</label>
          <input id="layer-color" type="color" value={sd.textColor || '#FFFFFF'} onChange={(e) => setStyle({ textColor: e.target.value })} className="w-full h-8 bg-[#11151A] border border-[#262D36] rounded-lg cursor-pointer" />
        </div>
        <div>
          <label className={label} htmlFor="layer-opacity">Opacity {Math.round((layer.opacity ?? 1) * 100)}%</label>
          <input id="layer-opacity" type="range" min={0} max={100} value={Math.round((layer.opacity ?? 1) * 100)} onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })} className="w-full accent-primary-500" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="layer-scale">Scale {Math.round((layer.scale ?? 1) * 100)}%</label>
        <input id="layer-scale" type="range" min={25} max={300} value={Math.round((layer.scale ?? 1) * 100)} onChange={(e) => onUpdate({ scale: Number(e.target.value) / 100 })} className="w-full accent-primary-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="layer-x">Position X %</label>
          <input id="layer-x" type="number" min={0} max={100} value={Math.round((pos.x ?? 0.5) * 100)} onChange={(e) => setPos({ x: num(e.target.value, 0, 100, 50) / 100 })} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="layer-y">Position Y %</label>
          <input id="layer-y" type="number" min={0} max={100} value={Math.round((pos.y ?? 0.5) * 100)} onChange={(e) => setPos({ y: num(e.target.value, 0, 100, 50) / 100 })} className={field} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="layer-start">Start (s)</label>
          <input id="layer-start" type="number" min={0} step={0.1} value={layer.startTime ?? 0} onChange={(e) => onUpdate({ startTime: Math.min(num(e.target.value, 0, 36000, 0), (layer.endTime ?? Infinity) - 0.1) })} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="layer-end">End (s)</label>
          <input id="layer-end" type="number" min={0} step={0.1} value={layer.endTime ?? ''} onChange={(e) => onUpdate({ endTime: Math.max(num(e.target.value, 0, 36000, 0), (layer.startTime ?? 0) + 0.1) })} className={field} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white">
          <input type="checkbox" checked={!!sd.strokeEnabled} onChange={(e) => setStyle({ strokeEnabled: e.target.checked, strokeWidth: sd.strokeWidth || 2 })} className="accent-primary-500" />
          Outline
        </label>
        {sd.strokeEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Outline color" type="color" value={sd.strokeColor || '#000000'} onChange={(e) => setStyle({ strokeColor: e.target.value })} className="w-full h-8 bg-[#11151A] border border-[#262D36] rounded-lg cursor-pointer" />
            <input aria-label="Outline width" type="number" min={1} max={12} value={sd.strokeWidth ?? 2} onChange={(e) => setStyle({ strokeWidth: num(e.target.value, 1, 12, 2) })} className={field} />
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-white">
          <input type="checkbox" checked={!!sd.shadowEnabled} onChange={(e) => setStyle({ shadowEnabled: e.target.checked })} className="accent-primary-500" />
          Shadow
        </label>
      </div>

      <div>
        <label className={label} htmlFor="layer-anim">Entrance animation</label>
        <select
          id="layer-anim"
          value={(layer.animation_data as any)?.type || 'none'}
          onChange={(e) => onUpdate({ animation_data: { ...(layer.animation_data || {}), type: e.target.value as any } })}
          className={field}
        >
          <option value="none">None</option>
          <option value="fade">Fade</option>
          <option value="fade-up">Fade up</option>
          <option value="pop">Pop in</option>
          <option value="slide-up">Slide up</option>
          <option value="scale">Scale up</option>
        </select>
      </div>
    </fieldset>
  );
}
