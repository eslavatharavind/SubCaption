import { describe, expect, it } from 'vitest';
import type { CaptionLayerMeta, TextLayer } from '@/types/caption';
import {
  CAPTION_LAYER_ID,
  DEFAULT_CAPTION_LAYER,
  PERSON_CUTOUT_Z,
  buildLayerEntries,
  computeStack,
  dropAt,
  moveInOrder,
  reorderLayers,
  sanitizeLayers,
  uniqueLayerName,
} from '@/lib/layers';

const L = (id: string, zIndex: number, extra: Partial<TextLayer> = {}): TextLayer => ({ id, text: id.toUpperCase(), zIndex, ...extra });
const caption = (extra: Partial<CaptionLayerMeta> = {}): CaptionLayerMeta => ({ ...DEFAULT_CAPTION_LAYER, ...extra });

describe('layer ordering', () => {
  it('lists front-most first and includes the caption track', () => {
    const e = buildLayerEntries(caption({ zIndex: 1 }), [L('a', 0), L('b', 2)]);
    expect(e.map((x) => x.id)).toEqual(['b', CAPTION_LAYER_ID, 'a']);
    expect(e.find((x) => x.id === CAPTION_LAYER_ID)?.deletable).toBe(false);
    expect(e.find((x) => x.id === 'a')?.deletable).toBe(true);
  });

  it('reorderLayers renumbers z-index from the new order and keeps everything else', () => {
    const layers = [L('a', 1, { name: 'A', locked: true }), L('b', 2)];
    const r = reorderLayers(caption({ zIndex: 0 }), layers, ['a', CAPTION_LAYER_ID, 'b']);
    expect(r.layers.find((l) => l.id === 'a')?.zIndex).toBe(2);
    expect(r.caption.zIndex).toBe(1);
    expect(r.layers.find((l) => l.id === 'b')?.zIndex).toBe(0);
    expect(r.layers.find((l) => l.id === 'a')).toMatchObject({ name: 'A', locked: true });
  });

  it('reorderLayers ignores unknown ids and appends missing ones at the back', () => {
    const r = reorderLayers(caption(), [L('a', 1), L('b', 2)], ['ghost', 'a']);
    const order = buildLayerEntries(r.caption, r.layers).map((e) => e.id);
    expect(order[0]).toBe('a');
    expect(new Set(order)).toEqual(new Set(['a', 'b', CAPTION_LAYER_ID]));
  });

  it('moveInOrder and dropAt behave like a list editor', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(moveInOrder(order, 'c', 'forward')).toEqual(['a', 'c', 'b', 'd']);
    expect(moveInOrder(order, 'a', 'forward')).toEqual(order);
    expect(moveInOrder(order, 'b', 'backward')).toEqual(['a', 'c', 'b', 'd']);
    expect(moveInOrder(order, 'd', 'front')).toEqual(['d', 'a', 'b', 'c']);
    expect(moveInOrder(order, 'a', 'back')).toEqual(['b', 'c', 'd', 'a']);
    expect(dropAt(order, 'a', 3)).toEqual(['b', 'c', 'a', 'd']);
    expect(dropAt(order, 'd', 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(dropAt(order, 'b', 4)).toEqual(['a', 'c', 'd', 'b']);
  });
});

describe('stacking', () => {
  it('puts behind layers under the person cut-out and front layers above it', () => {
    const s = computeStack(caption({ zIndex: 1, layering: 'behind' }), [L('t', 2), L('u', 0, { layering: 'behind' })]);
    expect(s.captionZ).toBeLessThan(PERSON_CUTOUT_Z);
    expect(s.layerZ.u).toBeLessThan(PERSON_CUTOUT_Z);
    expect(s.layerZ.t).toBeGreaterThan(PERSON_CUTOUT_Z);
    expect(s.anyBehind).toBe(true);
  });

  it('keeps relative order within each group', () => {
    const s = computeStack(caption({ zIndex: 5 }), [L('a', 1), L('b', 3)]);
    expect(s.layerZ.a).toBeLessThan(s.layerZ.b);
    expect(s.layerZ.b).toBeLessThan(s.captionZ);
  });

  it('ignores hidden layers when deciding whether segmentation is needed', () => {
    const s = computeStack(caption(), [L('h', 1, { layering: 'behind', visible: false })]);
    expect(s.anyBehind).toBe(false);
  });

  it('export mode stacks everything in front with the same relative order', () => {
    const layers = [L('a', 1, { layering: 'behind' }), L('b', 2)];
    const s = computeStack(caption({ zIndex: 0 }), layers, false);
    expect(Math.min(s.captionZ, s.layerZ.a, s.layerZ.b)).toBeGreaterThan(PERSON_CUTOUT_Z);
    expect(s.captionZ).toBeLessThan(s.layerZ.a);
    expect(s.layerZ.a).toBeLessThan(s.layerZ.b);
  });

  it('never lets behind layers reach the cut-out level, even with many layers', () => {
    const many = Array.from({ length: 20 }, (_, i) => L(`l${i}`, i + 1, { layering: 'behind' }));
    const s = computeStack(caption(), many);
    Object.values(s.layerZ).forEach((z) => expect(z).toBeLessThan(PERSON_CUTOUT_Z));
  });
});

describe('naming and persistence', () => {
  it('generates unique names', () => {
    expect(uniqueLayerName('Text layer', [])).toBe('Text layer');
    expect(uniqueLayerName('Text layer', ['Text layer'])).toBe('Text layer 2');
    expect(uniqueLayerName('Text layer', ['text layer', 'Text layer 2'])).toBe('Text layer 3');
  });

  it('sanitizes stored layers and rejects junk', () => {
    expect(sanitizeLayers(null)).toBeNull();
    expect(sanitizeLayers({ layers: 'nope' })).toBeNull();
    const ok = sanitizeLayers({
      caption: { name: ' ', visible: false, locked: 1, layering: 'behind', zIndex: 'x' },
      layers: [{ id: 'a', text: 'hi', zIndex: 3, layering: 'weird' }, { nope: true }, { id: 7, text: 'bad id' }],
    });
    expect(ok?.caption).toEqual({ name: 'Captions', visible: false, locked: true, layering: 'behind', zIndex: 0 });
    expect(ok?.layers).toHaveLength(1);
    expect(ok?.layers[0]).toMatchObject({ id: 'a', layering: 'front', zIndex: 3 });
  });
});
