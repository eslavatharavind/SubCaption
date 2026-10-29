'use client';

/**
 * Renderer for Advanced-library templates (templates that define `advanced`).
 * Basic templates never reach this component. Everything is derived from `currentTime`,
 * so gallery previews, editor playback and frame-by-frame export produce the same frames.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { AdvTextStyle } from '@/types/template';
import type { CaptionRendererProps } from './CaptionRenderer';
import { getGraphemes, applyTextCasing, getRgbaColor } from './CaptionRenderer';
import { loadFontOnDemand, getFontFamilyWithFallback } from '@/lib/fonts/fontLoader';
import {
  TimedToken,
  aksharaClusters,
  activeWordAt,
  clamp01,
  ease,
  groupWords,
  introStyle,
  keywordFxStyle,
  lerp,
  motionStyle,
  pickKeywords,
  resolveColor,
  revealTime,
  segmentProgress,
  spokenProgress,
} from '@/lib/advanced/engine';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const sameBoxes = (a: Box[], b: Box[]) =>
  a.length === b.length && a.every((r, i) => Math.abs(r.x - b[i].x) < 0.5 && Math.abs(r.y - b[i].y) < 0.5 && Math.abs(r.w - b[i].w) < 0.5 && Math.abs(r.h - b[i].h) < 0.5);

/** Layout position of `el` relative to `root`, ignoring CSS transforms (offset chain). */
function offsetWithin(el: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const MIN_FIT = 0.5;
const MAX_FIT_PASSES = 4;

/** Nearest ancestor that clips its content (the video canvas / export frame). Its size never depends on the caption. */
function findClippingAncestor(start: HTMLElement | null): HTMLElement | null {
  let el = start;
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Width the caption may occupy. Word-group and text-layer wrappers are absolutely positioned and
 * sized by their content, and the renderer root is `max-width: 92%` of that wrapper, so the root is
 * always narrower than its own content there. For those, derive the limit from the wrapper's
 * max-width against the canvas (independent of the caption); otherwise the root's own width is fine.
 */
function availableWidth(root: HTMLElement, clip: HTMLElement | null): number {
  const holder = root.parentElement?.parentElement;
  if (holder) {
    const cs = getComputedStyle(holder);
    if (cs.position === 'absolute' && !holder.style.width) {
      const base = (holder.offsetParent as HTMLElement | null)?.clientWidth || clip?.clientWidth || 0;
      if (base > 0) {
        const pct = cs.maxWidth.endsWith('%') ? parseFloat(cs.maxWidth) / 100 : 1;
        const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        return Math.max(40, (base * pct - pad) * 0.92);
      }
    }
  }
  return root.clientWidth;
}

const joinTransforms = (...t: (string | undefined)[]) => t.filter(Boolean).join(' ') || undefined;

export function AdvancedCaptionRenderer({
  words,
  template,
  currentTime,
  scaleMultiplier = 1,
  segmentStart: explicitStart,
  segmentEnd: explicitEnd,
  selectedWordIndex = null,
  onSelectWord,
  onWordPointerDown,
  className = '',
}: CaptionRendererProps) {
  const spec = template.advanced!;
  const mainRef = useRef<HTMLDivElement>(null);
  const [wordBoxes, setWordBoxes] = useState<Box[]>([]);
  const [lineBoxes, setLineBoxes] = useState<Box[]>([]);
  const [lineScales, setLineScales] = useState<number[]>([]);
  // Shrink-to-fit so long unbreakable words (common in Telugu/Hindi) never overflow the frame.
  const [fit, setFit] = useState(1);
  const fitKeyRef = useRef('');
  const fitPassesRef = useRef(0);
  const clipRef = useRef<HTMLElement | null>(null);

  // Fonts used by this composition (base, spec styles, per-word overrides)
  const ty = template.typography;
  const baseFont = ty?.fontFamily || template.fontFamily || 'Inter';
  const specFonts = [spec.keywordStyle?.font, spec.support?.font, spec.alternate?.font, spec.zones?.[0]?.font, spec.zones?.[1]?.font];
  const fontKey = [baseFont, ...specFonts, ...words.map((w) => w.styleOverrides?.fontFamily || w.fontFamily)].filter(Boolean).join('|');
  useEffect(() => {
    fontKey.split('|').forEach((f) => f && loadFontOnDemand(f));
  }, [fontKey]);

  // Measure word and line geometry for moving highlights, rails and justified lines.
  useIsoLayoutEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    // The fit key must only contain inputs that CANNOT depend on `fit`. Caption wrappers for word
    // groups and text layers are sized by their content, so their own width shrinks with `fit`;
    // keying on it made "shrink" change the key, the key change reset `fit`, and the two ping-pong
    // forever. The clipping canvas, text and typography are independent of the caption's size.
    let clip = clipRef.current;
    if (!clip || !clip.isConnected) {
      clip = findClippingAncestor(root.parentElement?.parentElement ?? null);
      clipRef.current = clip;
    }
    const fitKey = [
      words.map((w) => w.text).join(' '),
      template.id,
      scaleMultiplier,
      clip ? clip.clientWidth : 0,
      fontKey,
      ty?.fontSize,
      ty?.fontWeight,
      ty?.letterSpacing,
      ty?.textCasing,
    ].join('|');

    if (fitKeyRef.current !== fitKey) {
      // New inputs: re-measure at natural size first. The key is only marked as measured once we are
      // at fit === 1, so this reset happens exactly once per key change.
      if (fit !== 1) {
        setFit(1);
        return;
      }
      fitKeyRef.current = fitKey;
      fitPassesRef.current = 0;
    }

    const wEls = Array.from(root.querySelectorAll<HTMLElement>('[data-adv-word]'));
    const nextWords = wEls.map((el) => offsetWithin(el, root));
    // Use layout boxes (not scrollWidth) so entrance transforms never trigger shrinking.
    // Bounded refinement: a few passes converge; after that the current fit is accepted.
    if (nextWords.length && fitPassesRef.current < MAX_FIT_PASSES) {
      const needed = Math.max(...nextWords.map((b) => b.x + b.w)) - Math.min(0, ...nextWords.map((b) => b.x));
      const available = availableWidth(root, clip);
      if (needed > available + 1) {
        const next = Math.max(MIN_FIT, fit * (available / needed));
        if (Math.abs(next - fit) > 0.005) {
          fitPassesRef.current += 1;
          setFit(next);
        }
      }
    }
    if (!sameBoxes(nextWords, wordBoxes)) setWordBoxes(nextWords);
    const lEls = Array.from(root.querySelectorAll<HTMLElement>('[data-adv-line]'));
    const nextLines = lEls.map((el) => offsetWithin(el, root));
    if (!sameBoxes(nextLines, lineBoxes)) setLineBoxes(nextLines);
    if (spec.layout === 'justified') {
      const natural = lEls.map((el, i) => el.offsetWidth / (lineScales[i] || 1));
      const target = Math.max(...natural, 1);
      const next = natural.map((n) => Math.min(2.1, Math.max(0.7, target / Math.max(1, n))));
      if (next.length !== lineScales.length || next.some((s, i) => Math.abs(s - lineScales[i]) > 0.01)) setLineScales(next);
    }
  });

  if (!words || words.length === 0) return null;

  // ---- Timing ----
  const segStart = explicitStart ?? words[0]?.start ?? 0;
  const segEnd = explicitEnd ?? words[words.length - 1]?.end ?? segStart + 2.5;
  const span = Math.max(0.2, segEnd - segStart);
  const tokens: TimedToken[] = words.map((w, i) => ({
    text: w.text,
    start: w.start ?? segStart + (span * i) / words.length,
    end: w.end ?? segStart + (span * (i + 1)) / words.length,
  }));
  const t = currentTime ?? segEnd;
  const highlightOn = (template.highlight?.mode ?? 'active-word') !== 'none';
  const introAllowed = template.animation?.entrance !== 'none';
  const introP = introAllowed ? clamp01((t - segStart) / (spec.introDuration ?? 0.5)) : 1;
  const motionDur = spec.motionDuration ?? 0.35;
  const active = highlightOn ? activeWordAt(tokens, t) : -1;
  const groups = groupWords(tokens.length, spec);
  const lineOf = (i: number) => groups.findIndex((g) => g.includes(i));
  const keywords = pickKeywords(tokens.map((w) => w.text), spec.keyword);
  const firstKeyword = Array.from(keywords).sort((a, b) => a - b)[0];
  const keywordStarted = firstKeyword !== undefined && t >= tokens[firstKeyword].start;
  const segP = segmentProgress(t, segStart, segEnd);

  // ---- Palette and base typography (user font/colour overrides arrive through the template) ----
  const text = getRgbaColor(template.colors?.primaryTextColor || template.textColor || '#FFFFFF', 100);
  const accent = template.colors?.highlightColor || template.highlightColor || '#FFD600';
  const secondary = template.colors?.accentColor || template.accentColor || accent;
  const palette = { text, accent, secondary, muted: getRgbaColor(text, 55) };
  const frameBg = (typeof template.background === 'object' && template.background?.color) || 'rgba(12,14,18,0.82)';
  const baseSize = (ty?.fontSize ?? template.fontSize ?? 44) * scaleMultiplier;
  const baseWeight = ty?.fontWeight || template.fontWeight || 700;
  const casing = ty?.textCasing || 'none';
  const align = spec.align ?? 'center';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const styleFor = (i: number): AdvTextStyle => {
    const li = lineOf(i);
    let s: AdvTextStyle = {};
    if (spec.keyword && spec.keyword !== 'none') s = { ...s, ...(keywords.has(i) ? spec.keywordStyle : spec.support) };
    if (spec.zones) s = { ...s, ...spec.zones[Math.min(1, li)] };
    if (spec.layout === 'label' && li === 0 && !spec.zones) s = { ...s, scale: 0.45, weight: 800, casing: 'upper', tracking: 0.08 };
    if (spec.alternate && ((spec.alternateBy === 'line' ? li : i) % 2 === 1)) s = { ...s, ...spec.alternate };
    return s;
  };

  // ---- Word rendering ----
  const renderWord = (i: number, copy?: { color: string; stroke?: string; opacity?: number }): ReactNode => {
    const w = words[i];
    const tok = tokens[i];
    const s = styleFor(i);
    const isKeyword = keywords.has(i);
    const isActive = i === active;
    const spoken = t >= tok.start;
    const rt = revealTime(spec, tokens, i, groups, segStart);
    const p = clamp01((t - rt) / motionDur);
    const ov = (w.styleOverrides || {}) as Record<string, any>;

    const caseMode = s.casing === 'upper' ? 'uppercase' : s.casing === 'lower' ? 'lowercase' : casing;
    const label = applyTextCasing(w.text, caseMode);
    const userColor = ov.textColor || (w.color && w.color !== w.highlightColor ? w.color : undefined);
    // Words inside the label tag sit on the accent fill, so they always use dark text for contrast.
    const inLabelTag = spec.layout === 'label' && lineOf(i) === 0 && !copy;
    let color = inLabelTag ? '#0B0D10' : userColor || resolveColor(s.color, palette);
    const font = ov.fontFamily || w.fontFamily || s.font || baseFont;
    const sizeEm = (s.scale ?? 1) * (ov.fontSize ? ov.fontSize / (ty?.fontSize ?? 44) : 1);

    const transforms: (string | undefined)[] = [];
    let opacity = s.opacity ?? 1;
    let filter: string | undefined;
    let textShadow: string | undefined;
    let background: string | undefined;
    let padding: string | undefined;
    let radius: string | undefined;
    let boxShadow: string | undefined;
    let stroke: string | undefined;
    const decorations: ReactNode[] = [];

    // Entrance (word-level). Letter reveals animate graphemes instead.
    if (spec.reveal !== 'letter') {
      const m = motionStyle(spec.motion, p, i);
      transforms.push(m.transform);
      if (m.opacity !== undefined) opacity *= m.opacity;
      filter = m.filter;
      if (spec.reveal !== 'all' && (spec.motion ?? 'none') === 'none' && t < rt) opacity = 0;
    }

    // Faces
    if (spec.face === 'outline') {
      stroke = `${(baseSize * sizeEm * 0.035).toFixed(2)}px ${color}`;
    } else if (spec.face === 'sticker') {
      background = isKeyword ? accent : '#FFFFFF';
      color = userColor || '#111318';
      padding = '0.04em 0.28em';
      radius = '0.22em';
      boxShadow = '0 0.07em 0 rgba(0,0,0,0.35), 0 0 0 0.06em #FFFFFF';
      transforms.push(`rotate(${(((i * 53) % 9) - 4) * 0.8}deg)`);
    } else if (spec.face === 'chip') {
      background = frameBg;
      padding = '0.02em 0.24em';
      radius = '0.18em';
    }

    // Active-word and keyword treatments (respect highlight disabled = 'none')
    if (highlightOn) {
      const k = t - tok.start;
      switch (spec.active) {
        case 'color':
          if (isActive) color = accent;
          break;
        case 'scale':
          if (isActive) {
            color = accent;
            transforms.push(`scale(${(1 + 0.24 * ease.outBack(clamp01(k / 0.22))).toFixed(3)})`);
          }
          break;
        case 'glow':
          if (isActive) textShadow = `0 0 0.18em ${accent}, 0 0 0.45em ${accent}`;
          break;
        case 'box':
        case 'trail':
          if (isActive) color = spec.active === 'box' ? '#0B0D10' : color;
          break;
        case 'marker':
          if (isActive || (spec.persist && spoken)) {
            const mp = isActive ? ease.outCubic(clamp01(k / 0.25)) : 1;
            color = '#0B0D10';
            decorations.push(
              <span key="mk" aria-hidden="true" style={{ position: 'absolute', left: '-0.08em', right: '-0.08em', top: '18%', bottom: '4%', background: accent, opacity: isActive ? 0.92 : 0.5, transform: `scaleX(${mp.toFixed(3)}) skewX(-8deg)`, transformOrigin: 'left center', borderRadius: '0.08em', zIndex: -1 }} />
            );
          }
          break;
        case 'underline': {
          const up = spoken ? (isActive ? spokenProgress(tok, t) : 1) : 0;
          if (up > 0)
            decorations.push(
              <span key="ul" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: '-0.06em', height: '0.08em', borderRadius: '0.05em', background: accent, opacity: isActive ? 1 : 0.45, transform: `scaleX(${up.toFixed(3)})`, transformOrigin: 'left center' }} />
            );
          break;
        }
        case 'fill': {
          const fp = spoken ? (isActive ? spokenProgress(tok, t) : spec.persist === false ? 0 : 1) : 0;
          const fillColor = spec.face === 'outline' ? color : accent;
          if (spec.face !== 'outline') color = getRgbaColor(color, 38);
          decorations.push(
            <span key="fill" aria-hidden="true" style={{ position: 'absolute', inset: 0, color: fillColor, WebkitTextStroke: '0px transparent', clipPath: `inset(0 ${((1 - fp) * 100).toFixed(2)}% 0 0)`, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          );
          if (spec.face === 'outline') color = 'transparent';
          break;
        }
        case 'circle':
          if (isKeyword && spoken) {
            const cp = ease.inOutSine(clamp01(k / 0.55));
            decorations.push(
              <svg key="circ" aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: 'absolute', left: '-0.35em', right: '-0.35em', top: '-0.28em', bottom: '-0.28em', width: 'calc(100% + 0.7em)', height: 'calc(100% + 0.56em)', overflow: 'visible' }}>
                <path d="M8 22 C 6 6, 70 0, 93 14 C 104 24, 70 38, 38 37 C 10 36, 0 26, 14 12" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={(1 - cp).toFixed(3)} />
              </svg>
            );
          }
          break;
        case 'scribble':
          if (isKeyword && spoken) {
            const sp = ease.outCubic(clamp01(k / 0.5));
            decorations.push(
              <svg key="scrib" aria-hidden="true" viewBox="0 0 100 10" preserveAspectRatio="none" style={{ position: 'absolute', left: '-0.1em', width: 'calc(100% + 0.2em)', bottom: '-0.32em', height: '0.32em', overflow: 'visible' }}>
                <path d="M2 6 Q 10 1, 18 6 T 34 6 T 50 6 T 66 6 T 82 6 T 98 5" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={(1 - sp).toFixed(3)} />
              </svg>
            );
          }
          break;
        case 'redact': {
          const rp = spoken ? ease.outCubic(clamp01(k / 0.22)) : 0;
          if (rp < 1)
            decorations.push(
              <span key="red" aria-hidden="true" style={{ position: 'absolute', left: '-0.06em', right: '-0.06em', top: '8%', bottom: '2%', background: '#0A0A0A', borderRadius: '0.06em', transform: `scaleX(${(1 - rp).toFixed(3)})`, transformOrigin: 'right center' }} />
            );
          break;
        }
        case 'spotlight':
          if (keywordStarted) {
            const dp = clamp01((t - tokens[firstKeyword!].start) / 0.3);
            if (isKeyword) {
              color = accent;
              transforms.push(`scale(${(1 + 0.12 * dp).toFixed(3)})`);
              textShadow = `0 0 0.35em ${getRgbaColor(accent, 60)}`;
            } else opacity *= 1 - 0.68 * dp;
          }
          break;
        case 'focus': {
          const fp = spoken ? clamp01(k / 0.3) : 0;
          filter = joinTransforms(filter, `blur(${((1 - fp) * 0.12).toFixed(3)}em)`);
          opacity *= 0.4 + 0.6 * fp;
          break;
        }
        case 'dual':
          if (isKeyword && spoken) {
            background = accent;
            color = '#0B0D10';
            padding = '0 0.2em';
            radius = '0.14em';
          } else if (isActive) {
            color = secondary;
            decorations.push(<span key="du" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: '-0.05em', height: '0.07em', background: secondary }} />);
          }
          break;
      }
    }

    if (isKeyword && spoken) {
      const kf = keywordFxStyle(spec.keywordFx, t - tok.start);
      transforms.push(kf.transform);
    }
    if (inLabelTag) {
      color = '#0B0D10';
      textShadow = undefined;
    }

    // Cinematic light sweep across the composition during the intro
    if (spec.intro === 'sweep' && introP < 1) {
      const pos = lerp(-0.3, 1.3, introP);
      const x = (i + 0.5) / words.length;
      const glow = Math.max(0, 1 - Math.abs(pos - x) * 4);
      if (glow > 0) {
        textShadow = `0 0 0.3em rgba(255,255,255,${(glow * 0.8).toFixed(2)})`;
        filter = joinTransforms(filter, `brightness(${(1 + glow * 0.8).toFixed(2)})`);
      }
    }

    const content =
      spec.reveal === 'letter'
        ? (() => {
            const gs = aksharaClusters(getGraphemes(label));
            const gStep = Math.min(0.06, Math.max(0.02, (tok.end - tok.start) / Math.max(1, gs.length)));
            return gs.map((g, gi) => {
              const gp = clamp01((t - rt - gi * gStep) / 0.28);
              const m = motionStyle(spec.motion ?? 'drop', gp, gi);
              return (
                <span key={gi} style={{ display: 'inline-block', transform: m.transform, opacity: m.opacity ?? 1, filter: m.filter, whiteSpace: 'pre' }}>
                  {g}
                </span>
              );
            });
          })()
        : label;

    const style: CSSProperties = {
      position: 'relative',
      display: 'inline-block',
      isolation: 'isolate',
      whiteSpace: 'nowrap',
      fontFamily: getFontFamilyWithFallback(font),
      fontSize: `${sizeEm.toFixed(3)}em`,
      fontWeight: ov.fontWeight || w.fontWeight || s.weight || baseWeight,
      fontStyle: (ov.italic ?? w.italic ?? s.italic ?? ty?.italic) ? 'italic' : 'normal',
      letterSpacing: s.tracking !== undefined ? `${s.tracking}em` : undefined,
      textDecoration: s.strike ? 'line-through' : ov.underline || w.underline ? 'underline' : undefined,
      textDecorationColor: s.strike ? accent : undefined,
      textDecorationThickness: s.strike ? '0.08em' : undefined,
      color,
      opacity,
      filter,
      textShadow,
      background,
      padding,
      borderRadius: radius,
      boxShadow,
      WebkitTextStroke: stroke,
      transform: joinTransforms(...transforms),
      transformOrigin: 'center 70%',
      lineHeight: 1.08,
    };

    if (copy) {
      return (
        <span key={i} style={{ ...style, color: copy.color, WebkitTextStroke: copy.stroke, opacity: (copy.opacity ?? 1) * opacity, background: undefined, boxShadow: undefined, textShadow: undefined, filter: undefined }}>
          {label}
        </span>
      );
    }

    return (
      <span
        key={i}
        data-adv-word=""
        onClick={onSelectWord ? (e) => { e.stopPropagation(); onSelectWord(i); } : undefined}
        onPointerDown={onWordPointerDown ? (e) => onWordPointerDown(e, i) : undefined}
        className={selectedWordIndex === i ? 'outline outline-2 outline-amber-400 rounded' : undefined}
        style={style}
      >
        {decorations}
        {content}
      </span>
    );
  };

  // ---- Lines / layout ----
  // A group (tag, island) is shown once its first word has been revealed.
  const groupRevealed = (li: number) => {
    const first = groups[li]?.[0];
    return first === undefined || spec.reveal === 'all' || t >= revealTime(spec, tokens, first, groups, segStart);
  };

  const lineStyle = (li: number): CSSProperties => {
    const base: CSSProperties = { position: 'relative', display: 'flex', flexWrap: 'wrap', justifyContent: justify, alignItems: 'baseline', columnGap: '0.26em', rowGap: '0.06em' };
    const intro = introStyle(spec.intro === 'split' ? 'split' : undefined, introP, li);
    switch (spec.layout) {
      case 'stack':
        return { ...base, ...intro };
      case 'split':
        return { ...base, justifyContent: li === 0 ? 'flex-start' : 'flex-end', marginTop: li === 1 ? '0.12em' : undefined, ...intro };
      case 'label':
        return li === 0
          ? { ...base, justifyContent: justify, marginBottom: '0.18em', ...intro }
          : { ...base, ...intro };
      case 'justified':
        return { ...base, flexWrap: 'nowrap', width: 'fit-content', margin: '0 auto', fontSize: `${(lineScales[li] ?? 1).toFixed(3)}em`, lineHeight: 0.95, ...intro };
      case 'diagonal':
        return { ...base, flexWrap: 'nowrap', justifyContent: 'flex-start', marginLeft: `${li * 0.9}em`, ...intro };
      case 'offset':
        return { ...base, flexWrap: 'nowrap', justifyContent: li % 2 === 0 ? 'flex-start' : 'flex-end', padding: li % 2 === 0 ? '0 1.2em 0 0' : '0 0 0 1.2em', ...intro };
      case 'islands':
        return { ...base, display: 'inline-flex', flexWrap: 'nowrap', background: frameBg, borderRadius: '0.35em', padding: '0.1em 0.35em', transform: joinTransforms(`translate(${(((li * 37) % 5) - 2) * 0.12}em, ${li % 2 ? 0.18 : -0.12}em)`, intro.transform), opacity: groupRevealed(li) ? intro.opacity : 0 };
      case 'edge':
        return { ...base, justifyContent: 'flex-start', ...intro };
      default:
        return { ...base, ...intro };
    }
  };

  const renderLines = (copy?: { color: string; stroke?: string; opacity?: number }) => {
    if (spec.layout === 'thread') {
      const visible = groups.map((g, gi) => ({ g, gi })).filter(({ g }) => t >= tokens[g[0]].start - 0.02);
      const shown = (visible.length ? visible : [{ g: groups[0], gi: 0 }]).slice(-3);
      return shown.map(({ g, gi }, si) => {
        const newest = si === shown.length - 1;
        const age = clamp01((t - tokens[g[0]].start) / 0.3);
        const right = gi % 2 === 1;
        return (
          <div key={gi} data-adv-line="" style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', marginTop: si ? '0.2em' : 0, opacity: newest ? 1 : 0.55, transform: newest ? `translateY(${((1 - ease.outCubic(age)) * 0.4).toFixed(3)}em) scale(${(0.94 + 0.06 * age).toFixed(3)})` : 'scale(0.92)', transformOrigin: right ? 'right bottom' : 'left bottom' }}>
            <div style={{ position: 'relative', display: 'inline-flex', flexWrap: 'wrap', columnGap: '0.24em', padding: '0.18em 0.45em', borderRadius: right ? '0.6em 0.6em 0.15em 0.6em' : '0.6em 0.6em 0.6em 0.15em', background: copy ? 'transparent' : right ? accent : frameBg, color: right ? '#0B0D10' : undefined }}>
              {g.map((i) => renderWord(i, copy))}
            </div>
          </div>
        );
      });
    }
    return groups.map((g, li) => (
      <div key={li} data-adv-line="" style={lineStyle(li)}>
        {spec.layout === 'label' && li === 0 && !copy ? (
          <span style={{ display: 'inline-flex', columnGap: '0.26em', background: accent, padding: '0.02em 0.3em', borderRadius: '0.12em', opacity: groupRevealed(li) ? 1 : 0 }}>{g.map((i) => renderWord(i))}</span>
        ) : (
          g.map((i) => renderWord(i, copy))
        )}
      </div>
    ));
  };

  // ---- Moving highlight geometry ----
  const movingBoxes: ReactNode[] = [];
  if (highlightOn && active >= 0) {
    const pad = 0.12 * baseSize;
    const travel = ease.outCubic(clamp01((t - tokens[active].start) / 0.2));
    if ((spec.active === 'box' || spec.active === 'trail') && wordBoxes[active]) {
      const cur = wordBoxes[active];
      const prev = wordBoxes[Math.max(0, active - 1)] || cur;
      const r = spec.active === 'box'
        ? { x: lerp(prev.x, cur.x, travel), y: lerp(prev.y, cur.y, travel), w: lerp(prev.w, cur.w, travel), h: lerp(prev.h, cur.h, travel) }
        : cur;
      movingBoxes.push(<div key="box" style={{ position: 'absolute', left: r.x - pad, top: r.y - pad * 0.3, width: r.w + pad * 2, height: r.h + pad * 0.6, background: accent, borderRadius: pad, opacity: spec.active === 'trail' ? 0.85 : 1 }} />);
      if (spec.active === 'trail') {
        for (let back = 1; back <= 2; back++) {
          const j = active - back;
          if (j < 0 || !wordBoxes[j]) continue;
          const o = clamp01(1 - (t - tokens[j].end) / 0.7) * (0.55 / back);
          if (o <= 0) continue;
          const b = wordBoxes[j];
          movingBoxes.push(<div key={`tr${j}`} style={{ position: 'absolute', left: b.x - pad, top: b.y - pad * 0.3, width: b.w + pad * 2, height: b.h + pad * 0.6, background: accent, borderRadius: pad, opacity: o }} />);
        }
      }
    }
    if (spec.active === 'line-box') {
      const li = lineOf(active);
      const cur = lineBoxes[li];
      if (cur) {
        const prevLine = lineBoxes[Math.max(0, li - 1)] || cur;
        const firstOfLine = groups[li]?.[0] ?? active;
        const lt = ease.outCubic(clamp01((t - tokens[firstOfLine].start) / 0.3));
        const r = { x: lerp(prevLine.x, cur.x, lt), y: lerp(prevLine.y, cur.y, lt), w: lerp(prevLine.w, cur.w, lt), h: lerp(prevLine.h, cur.h, lt) };
        movingBoxes.push(<div key="lb" style={{ position: 'absolute', left: r.x - pad, top: r.y + r.h * 0.35, width: r.w + pad * 2, height: r.h * 0.6, background: accent, opacity: 0.45, transform: 'skewX(-10deg)', borderRadius: pad * 0.4 }} />);
      }
    }
  }

  // ---- Layer copies ----
  const layerNodes: ReactNode[] = [];
  const layerShift = ease.outCubic(introP);
  if (spec.layers === 'echo') {
    [2, 1].forEach((k) =>
      layerNodes.push(
        <div key={`echo${k}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: `translate(${(-k * 0.07 * layerShift).toFixed(3)}em, ${(-k * 0.07 * layerShift).toFixed(3)}em)`, pointerEvents: 'none' }}>
          {renderLines({ color: 'transparent', stroke: `${(baseSize * 0.03).toFixed(2)}px ${getRgbaColor(accent, k === 1 ? 75 : 40)}` })}
        </div>
      )
    );
  } else if (spec.layers === 'offset') {
    [2, 1].forEach((k) =>
      layerNodes.push(
        <div key={`off${k}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: `translate(${(k * 0.05).toFixed(3)}em, ${(k * 0.05).toFixed(3)}em)`, pointerEvents: 'none' }}>
          {renderLines({ color: k === 1 ? accent : secondary })}
        </div>
      )
    );
  } else if (spec.layers === 'double') {
    const drift = 0.05 + 0.025 * Math.sin(t * 2.2);
    [1, -1].forEach((d) =>
      layerNodes.push(
        <div key={`dbl${d}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: `translateX(${(d * drift).toFixed(3)}em)`, mixBlendMode: 'screen', pointerEvents: 'none' }}>
          {renderLines({ color: d > 0 ? accent : secondary, opacity: 0.55 })}
        </div>
      )
    );
  } else if (spec.layers === 'split-ghost') {
    [-1, 1].forEach((d) =>
      layerNodes.push(
        <div key={`sg${d}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: `translate(${(d * 0.4 * layerShift).toFixed(3)}em, ${(d * 0.95).toFixed(3)}em)`, pointerEvents: 'none' }}>
          {renderLines({ color: text, opacity: 0.16 })}
        </div>
      )
    );
  } else if (spec.layers === 'ghost-word' && firstKeyword !== undefined) {
    layerNodes.push(
      <div key="ghost" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${(0.85 + 0.15 * layerShift).toFixed(3)})`, fontSize: '2.7em', fontWeight: 900, fontFamily: getFontFamilyWithFallback(spec.keywordStyle?.font || baseFont), color: getRgbaColor(accent, 14), WebkitTextStroke: `${(baseSize * 0.05).toFixed(2)}px ${getRgbaColor(text, 22)}`, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: layerShift, lineHeight: 1 }}>
        {applyTextCasing(words[firstKeyword].text, 'uppercase')}
      </div>
    );
  }

  // ---- Progress indicators ----
  let progressNode: ReactNode = null;
  if (spec.progress === 'rail') {
    const dot = active >= 0 && wordBoxes[active] && mainRef.current ? (wordBoxes[active].x + wordBoxes[active].w / 2) / Math.max(1, mainRef.current.offsetWidth) : segP;
    progressNode = (
      <div aria-hidden="true" style={{ position: 'relative', height: '0.07em', marginTop: '0.3em', borderRadius: '0.05em', background: getRgbaColor(text, 22) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(segP * 100).toFixed(2)}%`, background: accent, borderRadius: '0.05em' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${(clamp01(dot) * 100).toFixed(2)}%`, width: '0.22em', height: '0.22em', borderRadius: '50%', background: accent, transform: 'translate(-50%, -50%)', boxShadow: `0 0 0 0.05em ${getRgbaColor('#000000', 40)}` }} />
      </div>
    );
  } else if (spec.progress === 'steps') {
    const current = Math.max(0, groups.findIndex((g, gi) => t >= tokens[g[0]].start && (gi === groups.length - 1 || t < tokens[groups[gi + 1][0]].start)));
    progressNode = (
      <div aria-hidden="true" style={{ display: 'flex', justifyContent: justify, gap: '0.14em', marginTop: '0.28em' }}>
        {groups.map((g, gi) => (
          <span key={gi} style={{ height: '0.14em', width: gi === current ? '0.6em' : '0.14em', borderRadius: '0.1em', background: t >= tokens[g[0]].start ? accent : getRgbaColor(text, 30) }} />
        ))}
      </div>
    );
  } else if (spec.progress === 'timeline') {
    progressNode = (
      <div aria-hidden="true" style={{ position: 'absolute', left: '-0.45em', top: '0.1em', bottom: '0.1em', width: '0.05em', background: getRgbaColor(text, 30) }}>
        {groups.map((g, gi) => (
          <span key={gi} style={{ position: 'absolute', left: '-0.06em', width: '0.17em', height: '0.05em', top: `${((gi / Math.max(1, groups.length)) * 100).toFixed(1)}%`, background: t >= tokens[g[0]].start ? accent : getRgbaColor(text, 40) }} />
        ))}
        <span style={{ position: 'absolute', left: '50%', top: `${(segP * 100).toFixed(2)}%`, width: '0.2em', height: '0.2em', borderRadius: '50%', background: accent, transform: 'translate(-50%, -50%)' }} />
      </div>
    );
  }

  // ---- Frames ----
  const frame = spec.frame ?? 'none';
  const rootFrame: CSSProperties = {};
  const frameNodes: ReactNode[] = [];
  const corner = (key: string, pos: CSSProperties, size: number, weight: number, e: number) => (
    <span key={key} aria-hidden="true" style={{ position: 'absolute', width: `${size}em`, height: `${size}em`, borderColor: accent, borderStyle: 'solid', borderWidth: 0, opacity: e, ...pos }} />
  );
  const fe = ease.outCubic(introP);
  switch (frame) {
    case 'box':
      Object.assign(rootFrame, { background: frameBg, padding: '0.28em 0.5em', borderRadius: '0.22em' });
      break;
    case 'card':
      Object.assign(rootFrame, { background: frameBg, padding: '0.5em 0.7em 0.45em', borderRadius: '0.3em', boxShadow: '0 0.3em 0.9em rgba(0,0,0,0.35)', borderTop: `0.07em solid ${accent}` });
      break;
    case 'bubble':
      Object.assign(rootFrame, { background: frameBg, padding: '0.3em 0.55em', borderRadius: '0.6em' });
      frameNodes.push(<span key="tail" aria-hidden="true" style={{ position: 'absolute', left: '0.7em', bottom: '-0.18em', width: '0.4em', height: '0.4em', background: frameBg, transform: 'rotate(45deg)', borderRadius: '0.06em' }} />);
      break;
    case 'bar':
      Object.assign(rootFrame, { background: frameBg, padding: '0.28em 0.6em', borderLeft: `0.14em solid ${accent}`, width: '100%', maxWidth: '100%' });
      break;
    case 'letterbox':
      Object.assign(rootFrame, { background: 'rgba(0,0,0,0.7)', padding: '0.4em 0.8em', width: '100%', maxWidth: '100%', borderTop: '1px solid rgba(255,255,255,0.18)', borderBottom: '1px solid rgba(255,255,255,0.18)' });
      break;
    case 'grid':
      Object.assign(rootFrame, {
        padding: '0.3em 0.55em',
        border: `1px solid ${getRgbaColor(accent, 45)}`,
        backgroundColor: 'rgba(5,8,12,0.55)',
        backgroundImage: `linear-gradient(${getRgbaColor(accent, 16)} 1px, transparent 1px), linear-gradient(90deg, ${getRgbaColor(accent, 16)} 1px, transparent 1px)`,
        backgroundSize: '0.45em 0.45em',
      });
      break;
    case 'elastic': {
      const s = 0.6 + 0.4 * ease.outElastic(introP);
      Object.assign(rootFrame, { padding: '0.28em 0.55em' });
      frameNodes.push(<span key="el" aria-hidden="true" style={{ position: 'absolute', inset: 0, border: `0.06em solid ${accent}`, borderRadius: '0.25em', transform: `scale(${s.toFixed(3)})` }} />);
      break;
    }
    case 'brackets': {
      const off = `${(-0.25 - (1 - fe) * 0.6).toFixed(3)}em`;
      Object.assign(rootFrame, { padding: '0.25em 0.5em' });
      frameNodes.push(
        corner('tl', { left: off, top: off, borderLeftWidth: '0.07em', borderTopWidth: '0.07em' }, 0.45, 0.07, fe),
        corner('tr', { right: off, top: off, borderRightWidth: '0.07em', borderTopWidth: '0.07em' }, 0.45, 0.07, fe),
        corner('bl', { left: off, bottom: off, borderLeftWidth: '0.07em', borderBottomWidth: '0.07em' }, 0.45, 0.07, fe),
        corner('br', { right: off, bottom: off, borderRightWidth: '0.07em', borderBottomWidth: '0.07em' }, 0.45, 0.07, fe)
      );
      break;
    }
    case 'hud': {
      Object.assign(rootFrame, { padding: '0.3em 0.6em' });
      const blink = Math.floor(t * 2) % 2 === 0 ? 1 : 0.35;
      frameNodes.push(
        corner('tl', { left: 0, top: 0, borderLeftWidth: '0.04em', borderTopWidth: '0.04em' }, 0.28, 0.04, 1),
        corner('tr', { right: 0, top: 0, borderRightWidth: '0.04em', borderTopWidth: '0.04em' }, 0.28, 0.04, 1),
        corner('bl', { left: 0, bottom: 0, borderLeftWidth: '0.04em', borderBottomWidth: '0.04em' }, 0.28, 0.04, 1),
        corner('br', { right: 0, bottom: 0, borderRightWidth: '0.04em', borderBottomWidth: '0.04em' }, 0.28, 0.04, 1),
        <span key="tick" aria-hidden="true" style={{ position: 'absolute', top: '-0.02em', left: '50%', width: `${(0.9 * fe).toFixed(3)}em`, height: '0.04em', background: accent, transform: 'translateX(-50%)' }} />,
        <span key="led" aria-hidden="true" style={{ position: 'absolute', right: '0.12em', top: '0.12em', width: '0.1em', height: '0.1em', background: accent, opacity: blink }} />
      );
      break;
    }
    case 'scanlines':
    case 'crt':
      Object.assign(rootFrame, { padding: '0.15em 0.35em' });
      frameNodes.push(
        <span key="scan" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.32) 0, rgba(0,0,0,0.32) 0.04em, transparent 0.04em, transparent 0.11em)', backgroundPositionY: `${((t * 0.5) % 0.11).toFixed(3)}em`, mixBlendMode: 'multiply' }} />
      );
      break;
    case 'quote':
      Object.assign(rootFrame, { padding: '0.35em 0.4em 0.1em 0.9em' });
      frameNodes.push(<span key="q" aria-hidden="true" style={{ position: 'absolute', left: '-0.05em', top: '-0.45em', fontFamily: 'Georgia, serif', fontSize: '2.4em', lineHeight: 1, color: accent, opacity: fe }}>&ldquo;</span>);
      break;
  }

  if (spec.intro === 'scan' && introP < 1) {
    frameNodes.push(<span key="scanbar" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: `${(ease.outCubic(introP) * 100).toFixed(2)}%`, height: '0.05em', background: accent, boxShadow: `0 0 0.3em ${accent}` }} />);
  }

  // ---- Composition-level transforms ----
  const intro = spec.intro === 'split' ? {} : introStyle(spec.intro, introP);
  const crtShadow = frame === 'crt' ? '-0.03em 0 rgba(255,0,90,0.55), 0.03em 0 rgba(0,220,255,0.55)' : undefined;
  const glitchShadow = spec.intro === 'glitch' && introP < 1 ? `${(-(1 - introP) * 0.08).toFixed(3)}em 0 rgba(255,0,90,0.8), ${((1 - introP) * 0.08).toFixed(3)}em 0 rgba(0,230,255,0.8)` : undefined;
  const flicker = frame === 'crt' ? 0.93 + 0.07 * Math.abs(Math.sin(t * 13)) : 1;
  const edgeRule = spec.layout === 'edge' ? { borderLeft: `0.08em solid ${accent}`, paddingLeft: '0.45em' } : {};

  const rootStyle: CSSProperties = {
    position: 'relative',
    width: 'fit-content',
    maxWidth: '92%',
    margin: '0 auto',
    boxSizing: 'border-box',
    fontFamily: getFontFamilyWithFallback(baseFont),
    fontSize: `${baseSize * fit}px`,
    fontWeight: baseWeight,
    letterSpacing: ty?.letterSpacing ? `${ty.letterSpacing * scaleMultiplier}px` : undefined,
    lineHeight: ty?.lineHeight ?? 1.12,
    color: text,
    textAlign: align,
    transform: joinTransforms(spec.tilt ? `rotate(${spec.tilt}deg)` : undefined, intro.transform),
    clipPath: intro.clipPath,
    opacity: (intro.opacity ?? 1) * flicker,
    textShadow: glitchShadow || crtShadow,
    ...edgeRule,
    ...rootFrame,
  };

  return (
    <div className={`caption-renderer-container advanced-caption ${className}`} style={rootStyle} data-advanced-template={template.id}>
      {layerNodes}
      <div ref={mainRef} style={{ position: 'relative', zIndex: 1 }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>{movingBoxes}</div>
        {renderLines()}
        {spec.progress === 'timeline' && progressNode}
      </div>
      {spec.progress !== 'timeline' && progressNode}
      {frameNodes}
    </div>
  );
}
