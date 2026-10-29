/**
 * Layer model helpers. The editor has two kinds of elements: the caption track (one entry) and
 * user-created text layers. Everything here is pure so ordering, stacking and persistence are testable.
 */
import type { CaptionLayerMeta, LayerLayering, TextLayer } from '@/types/caption';

export const CAPTION_LAYER_ID = 'captions';

export const DEFAULT_CAPTION_LAYER: CaptionLayerMeta = {
  name: 'Captions',
  visible: true,
  locked: false,
  layering: 'front',
  zIndex: 0,
};

export interface LayerEntry {
  id: string;
  kind: 'caption' | 'text';
  name: string;
  visible: boolean;
  locked: boolean;
  layering: LayerLayering;
  zIndex: number;
  deletable: boolean;
}

export const layerDisplayName = (l: TextLayer) => (l.name && l.name.trim()) || l.text.trim() || 'Text layer';

/** Entries ordered front-most first (the order shown in the panel). Ties are broken by id for stability. */
export function buildLayerEntries(caption: CaptionLayerMeta, layers: TextLayer[]): LayerEntry[] {
  const entries: LayerEntry[] = [
    {
      id: CAPTION_LAYER_ID,
      kind: 'caption',
      name: caption.name || 'Captions',
      visible: caption.visible,
      locked: caption.locked,
      layering: caption.layering,
      zIndex: caption.zIndex,
      deletable: false,
    },
    ...layers.map<LayerEntry>((l) => ({
      id: l.id,
      kind: 'text',
      name: layerDisplayName(l),
      visible: l.visible !== false,
      locked: !!l.locked,
      layering: l.layering ?? 'front',
      zIndex: l.zIndex,
      deletable: true,
    })),
  ];
  return entries.sort((a, b) => b.zIndex - a.zIndex || (a.id < b.id ? 1 : -1));
}

/** Re-number zIndex from a front-to-back list of ids. Unknown ids are ignored; missing ones go to the back. */
export function reorderLayers(
  caption: CaptionLayerMeta,
  layers: TextLayer[],
  frontToBack: string[]
): { caption: CaptionLayerMeta; layers: TextLayer[] } {
  const known = new Set([CAPTION_LAYER_ID, ...layers.map((l) => l.id)]);
  const ids = frontToBack.filter((id, i) => known.has(id) && frontToBack.indexOf(id) === i);
  buildLayerEntries(caption, layers).forEach((e) => {
    if (!ids.includes(e.id)) ids.push(e.id);
  });
  const z = new Map(ids.map((id, i) => [id, ids.length - 1 - i]));
  return {
    caption: { ...caption, zIndex: z.get(CAPTION_LAYER_ID) ?? 0 },
    layers: layers.map((l) => ({ ...l, zIndex: z.get(l.id) ?? l.zIndex })),
  };
}

export type MoveDirection = 'forward' | 'backward' | 'front' | 'back';

export function moveInOrder(frontToBack: string[], id: string, dir: MoveDirection): string[] {
  const i = frontToBack.indexOf(id);
  if (i < 0) return frontToBack;
  const next = frontToBack.filter((x) => x !== id);
  const target = dir === 'front' ? 0 : dir === 'back' ? next.length : dir === 'forward' ? Math.max(0, i - 1) : Math.min(next.length, i + 1);
  next.splice(target, 0, id);
  return next;
}

/** Move one id to sit at `toIndex` in a front-to-back list (used by drag and drop). */
export function dropAt(frontToBack: string[], id: string, toIndex: number): string[] {
  const from = frontToBack.indexOf(id);
  if (from < 0) return frontToBack;
  const next = frontToBack.filter((x) => x !== id);
  next.splice(Math.max(0, Math.min(next.length, toIndex > from ? toIndex - 1 : toIndex)), 0, id);
  return next;
}

export const BEHIND_Z_MAX = 9; // the person cut-out sits at z 10
export const PERSON_CUTOUT_Z = 10;
export const FRONT_Z_BASE = 20;

export interface StackResult {
  captionZ: number;
  layerZ: Record<string, number>;
  /** True when a visible element wants to sit behind the person. */
  anyBehind: boolean;
}

/**
 * Convert layer order into concrete CSS z-indexes:
 *   behind layers 1..9  <  person cut-out (10)  <  front layers 20+
 * `behindSupported=false` (export) places everything in front, keeping the same relative order.
 */
export function computeStack(caption: CaptionLayerMeta, layers: TextLayer[], behindSupported = true): StackResult {
  const asc = buildLayerEntries(caption, layers).reverse();
  const layerZ: Record<string, number> = {};
  let captionZ = FRONT_Z_BASE;
  let anyBehind = false;
  asc.forEach((e, rank) => {
    const behind = behindSupported && e.layering === 'behind';
    const z = behind ? 1 + Math.min(rank, BEHIND_Z_MAX - 1) : FRONT_Z_BASE + rank;
    if (e.visible && e.layering === 'behind') anyBehind = true;
    if (e.id === CAPTION_LAYER_ID) captionZ = z;
    else layerZ[e.id] = z;
  });
  return { captionZ, layerZ, anyBehind };
}

export function uniqueLayerName(base: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

// ---------------------------------------------------------------- persistence (this device only)

export const layersStorageKey = (projectId: string) => `cc_layers_v1:${projectId}`;

export interface PersistedLayers {
  caption: CaptionLayerMeta;
  layers: TextLayer[];
}

export function sanitizeLayers(raw: unknown): PersistedLayers | null {
  const r = raw as any;
  if (!r || typeof r !== 'object' || !Array.isArray(r.layers)) return null;
  const c = r.caption || {};
  const caption: CaptionLayerMeta = {
    name: typeof c.name === 'string' && c.name.trim() ? c.name : DEFAULT_CAPTION_LAYER.name,
    visible: c.visible !== false,
    locked: !!c.locked,
    layering: c.layering === 'behind' ? 'behind' : 'front',
    zIndex: Number.isFinite(c.zIndex) ? c.zIndex : 0,
  };
  const layers: TextLayer[] = r.layers
    .filter((l: any) => l && typeof l.id === 'string' && typeof l.text === 'string')
    .map((l: any) => ({ ...l, zIndex: Number.isFinite(l.zIndex) ? l.zIndex : 1, layering: l.layering === 'behind' ? 'behind' : 'front' }));
  return { caption, layers };
}

export function loadLayers(projectId: string): PersistedLayers | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(layersStorageKey(projectId));
    return raw ? sanitizeLayers(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLayers(projectId: string, data: PersistedLayers) {
  try {
    window.localStorage.setItem(layersStorageKey(projectId), JSON.stringify(data));
  } catch {
    /* storage unavailable or full: layers still work for this session */
  }
}
