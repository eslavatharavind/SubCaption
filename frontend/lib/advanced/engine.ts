/**
 * Advanced caption engine: pure, deterministic helpers used by AdvancedCaptionRenderer.
 * Every value is derived from playback time so preview, editor and frame-by-frame export match.
 */
import type { AdvancedSpec, AdvMotion, AdvIntro, AdvTextStyle } from '@/types/template';

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const ease = {
  outCubic: (p: number) => 1 - Math.pow(1 - p, 3),
  outQuad: (p: number) => 1 - (1 - p) * (1 - p),
  inOutSine: (p: number) => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
  outElastic: (p: number) => {
    if (p === 0 || p === 1) return p;
    return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

export interface TimedToken {
  text: string;
  start: number;
  end: number;
}

const QUESTION_WORDS = new Set(['what', 'why', 'how', 'who', 'when', 'where', 'which', 'can', 'is', 'are', 'do', 'does', 'did', 'should', 'would', 'could', 'will']);

/** Visible character length that does not split Indic grapheme clusters. */
export function graphemeLength(text: string): number {
  const Seg = typeof Intl !== 'undefined' ? (Intl as any).Segmenter : undefined;
  if (Seg) {
    try {
      return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text)).length;
    } catch {
      /* fall through */
    }
  }
  return Array.from(text).length;
}

// Indic viramas (Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam).
const VIRAMA_END = /[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D]$/;
const JOINER_START = /^[\u200C\u200D]/;

/**
 * Merge grapheme clusters into aksharas: a cluster ending in a virama (or followed by a
 * ZWJ/ZWNJ) belongs with the next one, so conjuncts like క్త / न्न are never animated apart.
 */
export function aksharaClusters(graphemes: string[]): string[] {
  const out: string[] = [];
  graphemes.forEach((g) => {
    const last = out[out.length - 1];
    if (last !== undefined && (VIRAMA_END.test(last) || JOINER_START.test(g))) out[out.length - 1] = last + g;
    else out.push(g);
  });
  return out;
}

// Built at runtime: the project's TS target rejects the `u` flag in regex literals.
const PUNCT_EDGES = new RegExp('^[\\p{P}\\p{S}]+|[\\p{P}\\p{S}]+$', 'gu');
const HAS_DIGIT = new RegExp('\\p{Nd}', 'u');
const stripPunct = (s: string) => s.replace(PUNCT_EDGES, '');

/** Pick keyword indices from the actual caption words (never invents text). */
export function pickKeywords(texts: string[], rule: AdvancedSpec['keyword'] = 'none', forced: boolean[] = []): Set<number> {
  const out = new Set<number>();
  forced.forEach((f, i) => f && out.add(i));
  if (out.size || !rule || rule === 'none' || texts.length === 0) return out;

  const longest = () => {
    let best = 0;
    texts.forEach((t, i) => {
      if (graphemeLength(stripPunct(t)) > graphemeLength(stripPunct(texts[best]))) best = i;
    });
    return best;
  };

  switch (rule) {
    case 'first':
      out.add(0);
      break;
    case 'last':
      out.add(texts.length - 1);
      break;
    case 'numeric':
      texts.forEach((t, i) => HAS_DIGIT.test(t) && out.add(i));
      if (!out.size) out.add(longest());
      break;
    case 'question': {
      const q = texts.findIndex((t) => /[?？]$/.test(t));
      const w = texts.findIndex((t) => QUESTION_WORDS.has(stripPunct(t).toLowerCase()));
      out.add(q >= 0 ? q : w >= 0 ? w : longest());
      break;
    }
    case 'alternate':
      texts.forEach((_, i) => i % 2 === 1 && out.add(i));
      break;
    case 'longest':
    default:
      out.add(longest());
  }
  return out;
}

/** Split word indices into visual groups (lines, zones, bubbles) for the chosen layout. */
export function groupWords(count: number, spec: Pick<AdvancedSpec, 'layout' | 'lineWords' | 'splitAt'>): number[][] {
  const idx = Array.from({ length: count }, (_, i) => i);
  if (count === 0) return [];
  const chunk = (n: number) => {
    const size = Math.max(1, n);
    const out: number[][] = [];
    for (let i = 0; i < count; i += size) out.push(idx.slice(i, i + size));
    return out;
  };
  switch (spec.layout) {
    case 'flow':
      return [idx];
    case 'stack':
      return idx.map((i) => [i]);
    case 'split': {
      const cut = Math.min(count - 1, Math.max(1, Math.round(count * (spec.splitAt ?? 0.5))));
      return count === 1 ? [idx] : [idx.slice(0, cut), idx.slice(cut)];
    }
    case 'label': {
      const k = Math.min(count - 1, Math.max(1, Math.round(spec.splitAt ?? 1)));
      return count === 1 ? [idx] : [idx.slice(0, k), idx.slice(k)];
    }
    default:
      return chunk(spec.lineWords ?? 3);
  }
}

/** Index of the word currently being spoken (stays on the last spoken word between words). */
export function activeWordAt(words: TimedToken[], t: number): number {
  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].start) active = i;
  }
  return active;
}

export const spokenProgress = (w: TimedToken, t: number) =>
  clamp01((t - w.start) / Math.max(0.05, w.end - w.start));

/** Time at which a word starts its own entrance, by reveal mode. */
export function revealTime(
  spec: Pick<AdvancedSpec, 'reveal' | 'stagger'>,
  words: TimedToken[],
  i: number,
  groups: number[][],
  segStart: number
): number {
  switch (spec.reveal) {
    case 'word':
    case 'letter':
      return words[i].start;
    case 'line': {
      const g = groups.find((grp) => grp.includes(i));
      return g ? words[g[0]].start : words[i].start;
    }
    case 'all':
    default:
      return segStart + i * (spec.stagger ?? 0);
  }
}

export interface MotionStyle {
  transform?: string;
  opacity?: number;
  filter?: string;
}

/** Per-word (or per-grapheme) entrance motion for progress p in [0,1]. */
export function motionStyle(motion: AdvMotion | undefined, p: number, i: number): MotionStyle {
  const e = ease.outCubic(p);
  switch (motion) {
    case 'fade':
      return { opacity: p };
    case 'drop':
      return { opacity: clamp01(p * 3), transform: `translateY(${(-(1 - ease.outBack(p)) * 0.7).toFixed(3)}em)` };
    case 'rise':
      return { opacity: e, transform: `translateY(${((1 - e) * 0.55).toFixed(3)}em)` };
    case 'slide':
      return { opacity: e, transform: `translateX(${(-(1 - e) * 0.9).toFixed(3)}em)` };
    case 'alternate': {
      const dir = [[-1, 0], [1, 0], [0, -1], [0, 1]][i % 4];
      return { opacity: e, transform: `translate(${(dir[0] * (1 - e) * 0.9).toFixed(3)}em, ${(dir[1] * (1 - e) * 0.7).toFixed(3)}em)` };
    }
    case 'elastic':
      return { opacity: clamp01(p * 4), transform: `scale(${(0.35 + 0.65 * ease.outElastic(p)).toFixed(3)})` };
    case 'stomp':
      return { opacity: clamp01(p * 5), transform: `scale(${(1 + (1 - ease.outQuad(p)) * 0.7).toFixed(3)}) translateY(${(-(1 - e) * 0.2).toFixed(3)}em)` };
    case 'wave': {
      const y = Math.sin(p * Math.PI * 2) * (1 - p) * 0.3;
      return { opacity: e, transform: `translateY(${(((1 - e) * 0.45) - y).toFixed(3)}em)` };
    }
    case 'blur':
      return { opacity: 0.25 + 0.75 * e, filter: `blur(${((1 - e) * 0.16).toFixed(3)}em)` };
    case 'zoom':
      return { opacity: e, transform: `scale(${(0.55 + 0.45 * e).toFixed(3)})` };
    case 'rotate':
      return { opacity: e, transform: `rotate(${(-(1 - e) * 24).toFixed(2)}deg) translateY(${((1 - e) * 0.3).toFixed(3)}em)` };
    case 'slam':
      return { opacity: clamp01(p * 4), transform: `scale(${(1 + (1 - ease.outBack(p)) * 1.2).toFixed(3)})` };
    case 'flow':
      return { opacity: e, transform: `translate(${(-(1 - e) * 0.8).toFixed(3)}em, ${((1 - e) * 0.8).toFixed(3)}em)` };
    case 'none':
    default:
      return {};
  }
}

export interface IntroStyle extends MotionStyle {
  clipPath?: string;
}

/** Whole-composition entrance for progress p in [0,1]. Line index is used by the 'split' intro. */
export function introStyle(intro: AdvIntro | undefined, p: number, line = 0): IntroStyle {
  if (!intro || intro === 'none' || p >= 1) return {};
  const e = ease.outCubic(p);
  switch (intro) {
    case 'fade':
      return { opacity: e };
    case 'slam':
      return { opacity: clamp01(p * 4), transform: `scale(${(1 + (1 - ease.outBack(p)) * 0.9).toFixed(3)}) rotate(${(-(1 - e) * 5).toFixed(2)}deg)` };
    case 'curtain':
      return { clipPath: `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)` };
    case 'iris':
      return { clipPath: `circle(${(e * 85).toFixed(2)}% at 50% 50%)` };
    case 'shape': {
      const a = (50 - 50 * e * 1.2).toFixed(2);
      const b = (50 + 50 * e * 1.2).toFixed(2);
      return { clipPath: `polygon(50% ${a}%, ${b}% 50%, 50% ${b}%, ${a}% 50%)` };
    }
    case 'split': {
      const dir = line % 2 === 0 ? -1 : 1;
      return { opacity: e, transform: `translateX(${(dir * (1 - e) * 1.6).toFixed(3)}em)` };
    }
    case 'scan':
      return { clipPath: `inset(0 0 ${((1 - e) * 100).toFixed(2)}% 0)` };
    case 'glitch': {
      const step = Math.floor(p * 14);
      const jitter = (((step * 7919) % 5) - 2) * 0.035 * (1 - p);
      return { transform: `translateX(${jitter.toFixed(3)}em) skewX(${(jitter * 60).toFixed(2)}deg)`, opacity: 0.6 + 0.4 * e };
    }
    case 'elastic':
      return { transform: `scale(${(0.55 + 0.45 * ease.outElastic(p)).toFixed(3)})`, opacity: clamp01(p * 4) };
    case 'shake':
      return { transform: `translateX(${(Math.sin(p * 40) * (1 - p) * 0.08).toFixed(3)}em)` };
    case 'sweep':
      return {};
    default:
      return {};
  }
}

/** Keyword-only emphasis after the keyword is spoken (k = seconds since keyword start). */
export function keywordFxStyle(fx: AdvancedSpec['keywordFx'], k: number): MotionStyle {
  if (!fx || fx === 'none' || k < 0) return {};
  const p = clamp01(k / 0.45);
  switch (fx) {
    case 'shake':
      return { transform: `rotate(${(Math.sin(p * 30) * (1 - p) * 6).toFixed(2)}deg)` };
    case 'pulse':
      return { transform: `scale(${(1.04 + 0.05 * Math.sin(k * Math.PI * 3)).toFixed(3)})` };
    case 'rotate':
      return { transform: `rotate(${(-7 * ease.outBack(p)).toFixed(2)}deg)` };
    case 'slam':
      return { transform: `scale(${(1 + (1 - ease.outBack(p)) * 1.1).toFixed(3)})` };
    default:
      return {};
  }
}

export const segmentProgress = (t: number, start: number, end: number) => clamp01((t - start) / Math.max(0.05, end - start));

/** Resolve a semantic style colour against the template palette. */
export function resolveColor(c: AdvTextStyle['color'], palette: { text: string; accent: string; secondary: string; muted: string }) {
  switch (c) {
    case 'accent':
      return palette.accent;
    case 'secondary':
      return palette.secondary;
    case 'muted':
      return palette.muted;
    default:
      return palette.text;
  }
}

/** True whenever an advanced template may change between frames (used by the exporter's frame cache). */
export function advancedNeedsFrame(spec: AdvancedSpec | undefined): boolean {
  return Boolean(spec);
}

/** Every advanced spec field that changes rendering; used by uniqueness tests and documentation. */
export function specSignature(spec: AdvancedSpec): Record<string, string> {
  const hierarchy = spec.zones
    ? 'zones'
    : spec.layout === 'label'
    ? 'label'
    : spec.alternate
    ? 'alternate'
    : spec.keyword && spec.keyword !== 'none' && (spec.keywordStyle?.scale ?? 1) !== 1
    ? 'keyword-scale'
    : spec.keyword && spec.keyword !== 'none'
    ? 'keyword'
    : 'uniform';
  return {
    layout: spec.layout,
    hierarchy,
    reveal: spec.reveal,
    motion: spec.motion ?? 'none',
    active: spec.active ?? 'none',
    face: spec.face ?? 'solid',
    layers: spec.layers ?? 'none',
    frame: spec.frame ?? 'none',
    progress: spec.progress ?? 'none',
    intro: spec.intro ?? 'none',
    keywordFx: spec.keywordFx ?? 'none',
  };
}
