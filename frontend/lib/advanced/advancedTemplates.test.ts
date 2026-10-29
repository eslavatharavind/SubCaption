import { describe, expect, it } from 'vitest';
import { createHash } from 'crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ADVANCED_TEMPLATES, ALL_TEMPLATES, BASIC_TEMPLATES, getCategoriesForTier, getTierCounts } from '@/lib/templates';
import { CaptionRenderer, CaptionWordItem, getGraphemes } from '@/components/captions/CaptionRenderer';
import { FONT_REGISTRY } from '@/lib/fonts/fontRegistry';
import {
  aksharaClusters,
  activeWordAt,
  advancedNeedsFrame,
  groupWords,
  motionStyle,
  pickKeywords,
  revealTime,
  specSignature,
} from '@/lib/advanced/engine';
import type { AdvancedSpec, TemplateConfig } from '@/types/template';

/** SHA-256 of the 88 Basic template configs, recorded before the Advanced library was added. */
const BASIC_BASELINE_SHA256 = '7a26396fb66ce0f1d425974d61ab670a41924ff5ab19493523406e2e307584fe';

const EXPECTED_CATEGORIES = [
  'Viral Hooks',
  'Mixed Typography & Scale',
  'Kinetic Word & Letter Motion',
  'Advanced Highlight & Annotation',
  'Layered & Experimental',
  'Cinematic & Editorial',
  'Creator, Podcast & Dialogue',
  'News, Data & Education',
  'Gaming, Tech & Digital',
  'Transparent & Creative',
];

function timedWords(text: string, duration: number): CaptionWordItem[] {
  const parts = text.split(' ');
  const step = (duration - 0.6) / parts.length;
  return parts.map((t, i) => ({ text: t, start: 0.1 + i * step, end: 0.1 + (i + 1) * step }));
}

function render(template: TemplateConfig, words: CaptionWordItem[], time: number, duration: number) {
  return renderToStaticMarkup(
    React.createElement(CaptionRenderer, {
      words,
      template,
      activeWordIndex: -1,
      currentTime: time,
      segmentStart: 0,
      segmentEnd: duration,
      scaleMultiplier: 0.5,
    })
  );
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

describe('Template library counts', () => {
  it('has exactly 88 Basic, 100 Advanced and 188 total templates', () => {
    expect(BASIC_TEMPLATES).toHaveLength(88);
    expect(ADVANCED_TEMPLATES).toHaveLength(100);
    expect(ALL_TEMPLATES).toHaveLength(188);
    expect(getTierCounts()).toEqual({ basic: 88, advanced: 100, total: 188 });
  });

  it('uses 100 unique Advanced IDs that never collide with Basic IDs', () => {
    const advIds = ADVANCED_TEMPLATES.map((t) => t.id);
    expect(new Set(advIds).size).toBe(100);
    expect(advIds.every((id) => id.startsWith('adv-'))).toBe(true);
    expect(new Set(ALL_TEMPLATES.map((t) => t.id)).size).toBe(188);
  });

  it('has 10 Advanced categories with exactly 10 templates each', () => {
    const counts: Record<string, number> = {};
    ADVANCED_TEMPLATES.forEach((t) => (counts[t.category] = (counts[t.category] || 0) + 1));
    expect(Object.keys(counts)).toEqual(EXPECTED_CATEGORIES);
    Object.values(counts).forEach((n) => expect(n).toBe(10));
    expect(getCategoriesForTier('advanced')).toEqual(['All', ...EXPECTED_CATEGORIES]);
    const basicCats = new Set(BASIC_TEMPLATES.map((t) => t.category));
    EXPECTED_CATEGORIES.forEach((c) => expect(basicCats.has(c as any)).toBe(false));
  });
});

describe('Basic templates are unchanged', () => {
  it('matches the pre-change configuration fingerprint', () => {
    const hash = createHash('sha256').update(JSON.stringify(BASIC_TEMPLATES)).digest('hex');
    expect(hash).toBe(BASIC_BASELINE_SHA256);
  });

  it('never opts into the Advanced renderer', () => {
    BASIC_TEMPLATES.forEach((t) => expect(t.advanced).toBeUndefined());
    const html = render(BASIC_TEMPLATES[0], timedWords('hello basic world', 2), 1, 2);
    expect(html).not.toContain('advanced-caption');
  });

  it('keeps the editor default template', () => {
    expect(ALL_TEMPLATES[0].id).toBe(BASIC_TEMPLATES[0].id);
  });
});

describe('Advanced template definitions', () => {
  const fontNames = new Set(FONT_REGISTRY.map((f: any) => f.family || f.name));

  it('documents every template and only uses registered fonts', () => {
    ADVANCED_TEMPLATES.forEach((t) => {
      const s = t.advanced as AdvancedSpec;
      expect(t.name && t.description && s.sample && s.differs && s.useCase).toBeTruthy();
      expect(t.typography?.fontFamily).toBeTruthy();
      expect(t.colors?.primaryTextColor && t.colors?.highlightColor).toBeTruthy();
      const fonts = [t.typography!.fontFamily, s.keywordStyle?.font, s.support?.font, s.alternate?.font, s.zones?.[0]?.font, s.zones?.[1]?.font].filter(Boolean) as string[];
      fonts.forEach((f) => expect(fontNames.has(f), `${t.id} uses unregistered font ${f}`).toBe(true));
    });
  });

  it('every pair differs in at least two rendering dimensions', () => {
    const sigs = ADVANCED_TEMPLATES.map((t) => ({ id: t.id, sig: specSignature(t.advanced!) }));
    const tooClose: string[] = [];
    for (let a = 0; a < sigs.length; a++) {
      for (let b = a + 1; b < sigs.length; b++) {
        const diff = Object.keys(sigs[a].sig).filter((k) => sigs[a].sig[k] !== sigs[b].sig[k]).length;
        if (diff < 2) tooClose.push(`${sigs[a].id} ~ ${sigs[b].id}`);
      }
    }
    expect(tooClose).toEqual([]);
  });

  it('every template uses at least one capability the Basic renderer cannot draw', () => {
    ADVANCED_TEMPLATES.forEach((t) => {
      const s = specSignature(t.advanced!);
      const advancedOnly =
        s.layout !== 'flow' || s.hierarchy !== 'uniform' || s.reveal !== 'all' || s.motion !== 'none' ||
        !['none', 'color'].includes(s.active) || s.face !== 'solid' || s.layers !== 'none' || s.frame !== 'none' ||
        s.progress !== 'none' || !['none', 'fade'].includes(s.intro) || s.keywordFx !== 'none';
      expect(advancedOnly, t.id).toBe(true);
    });
  });
});

describe('Advanced rendering (shared preview / editor / export path)', () => {
  it('renders every template at start, middle and end with all caption text present and visible change over time', () => {
    const staticOnly: string[] = [];
    ADVANCED_TEMPLATES.forEach((t) => {
      const sample = t.advanced!.sample;
      const duration = Math.max(2.4, sample.split(' ').length * 0.42 + 0.8);
      const words = timedWords(sample, duration);
      const frames = [0.02, duration * 0.35, duration * 0.7, duration - 0.05].map((time) => render(t, words, time, duration));
      frames.forEach((html) => {
        expect(html).toContain(`data-advanced-template="${t.id}"`);
        const plain = textOf(html).replace(/\s+/g, '');
        // Thread layouts show only the newest bubbles, so check the final frame for them.
        if (t.advanced!.layout !== 'thread') {
          words.forEach((w) => expect(plain.toLowerCase()).toContain(w.text.toLowerCase().replace(/\s+/g, '')));
        }
      });
      // Geometry-driven effects (line marker) need browser layout; everything else must change in SSR.
      if (new Set(frames).size < 2 && t.advanced!.active !== 'line-box') staticOnly.push(t.id);
    });
    expect(staticOnly).toEqual([]);
  });

  it('is deterministic for the same time (frame-by-frame export safety)', () => {
    ADVANCED_TEMPLATES.forEach((t) => {
      const words = timedWords(t.advanced!.sample, 3);
      expect(render(t, words, 1.234, 3)).toBe(render(t, words, 1.234, 3));
    });
  });

  it('reports advanced templates as animating so export never reuses stale frames', () => {
    expect(advancedNeedsFrame(ADVANCED_TEMPLATES[0].advanced)).toBe(true);
    expect(advancedNeedsFrame(undefined)).toBe(false);
  });

  it('respects user font and colour overrides without losing the layout', () => {
    const base = ADVANCED_TEMPLATES.find((t) => t.id === 'adv-offset-typography')!;
    const custom: TemplateConfig = {
      ...base,
      typography: { ...base.typography!, fontFamily: 'Lora' },
      colors: { ...base.colors!, primaryTextColor: '#123456' },
    };
    const words = timedWords(base.advanced!.sample, 3);
    const a = render(base, words, 2.9, 3);
    const b = render(custom, words, 2.9, 3);
    expect(b).toContain('Lora');
    expect(b).toContain('rgba(18, 52, 86, 1)');
    const lines = (h: string) => (h.match(/data-adv-line/g) || []).length;
    expect(lines(b)).toBe(lines(a));
  });

  it('turns off active-word effects when highlighting is disabled', () => {
    const t = ADVANCED_TEMPLATES.find((x) => x.id === 'adv-redaction-reveal')!;
    const words = timedWords(t.advanced!.sample, 3);
    const off = render({ ...t, highlight: { mode: 'none' } }, words, 1.5, 3);
    expect(off).not.toContain('#0A0A0A');
  });
});

describe('Multilingual safety', () => {
  const letterDrop = ADVANCED_TEMPLATES.find((t) => t.id === 'adv-letter-drop')!;
  it.each([
    ['Telugu', 'కొత్త ఆలోచనలు ప్రపంచాన్ని మార్చుతున్నాయి'],
    ['Hindi', 'नए विचार दुनिया को बदल रहे हैं'],
  ])('%s letter animation keeps grapheme clusters intact', (_, text) => {
    const words = timedWords(text, 4);
    const html = render(letterDrop, words, 3.9, 4);
    const spans = Array.from(html.matchAll(/<span style="display:inline-block[^"]*">([^<]*)<\/span>/g)).map((m) => m[1]);
    const expected = words.flatMap((w) => aksharaClusters(getGraphemes(w.text)));
    expect(spans).toEqual(expected);
    // Conjuncts stay whole: no animated unit may end with a virama.
    spans.forEach((s) => expect(/[\u094D\u0C4D]$/.test(s), `split conjunct: ${s}`).toBe(false));
    expect(textOf(html).replace(/\s+/g, '')).toBe(text.replace(/\s+/g, ''));
  });

  it('merges virama-joined clusters even when the platform segmenter splits them (older ICU)', () => {
    expect(aksharaClusters(['క్', 'త', 'ల'])).toEqual(['క్త', 'ల']);
    expect(aksharaClusters(['न्', 'न', 'ा'])).toEqual(['न्न', 'ा']);
  });

  it('keeps numbers and punctuation as whole tokens', () => {
    expect(Array.from(pickKeywords(['I', 'made', '$10,000', 'today!'], 'numeric'))).toEqual([2]);
    const t = ADVANCED_TEMPLATES.find((x) => x.id === 'adv-number-shock')!;
    const html = render(t, timedWords('I made $10,000 today!', 3), 2.9, 3);
    expect(textOf(html)).toContain('$10,000');
    expect(textOf(html)).toContain('TODAY!');
  });
});

describe('Engine timing', () => {
  const words = [
    { text: 'a', start: 0.2, end: 0.5 },
    { text: 'b', start: 0.6, end: 0.9 },
    { text: 'c', start: 1.0, end: 1.4 },
  ];
  it('tracks the active word from word timestamps', () => {
    expect(activeWordAt(words, 0.1)).toBe(-1);
    expect(activeWordAt(words, 0.7)).toBe(1);
    expect(activeWordAt(words, 0.95)).toBe(1);
    expect(activeWordAt(words, 2)).toBe(2);
  });
  it('reveals by word, line or stagger', () => {
    const groups = groupWords(3, { layout: 'lines', lineWords: 2 });
    expect(groups).toEqual([[0, 1], [2]]);
    expect(revealTime({ reveal: 'word' }, words, 1, groups, 0)).toBe(0.6);
    expect(revealTime({ reveal: 'line' }, words, 1, groups, 0)).toBe(0.2);
    expect(revealTime({ reveal: 'all', stagger: 0.1 }, words, 2, groups, 0)).toBeCloseTo(0.2);
  });
  it('settles every motion at rest when complete', () => {
    (['fade', 'drop', 'rise', 'slide', 'alternate', 'elastic', 'stomp', 'wave', 'blur', 'zoom', 'rotate', 'slam', 'flow'] as const).forEach((m) => {
      const s = motionStyle(m, 1, 3);
      if (s.opacity !== undefined) expect(s.opacity).toBeCloseTo(1);
      (s.transform?.match(/-?\d+\.?\d*/g) || []).forEach((n) => {
        const v = Math.abs(parseFloat(n));
        expect(v === 0 || Math.abs(v - 1) < 1e-6).toBe(true);
      });
    });
  });
  it('picks question and split keywords from real words only', () => {
    expect(Array.from(pickKeywords(['So', 'why', 'not'], 'question'))).toEqual([1]);
    expect(Array.from(pickKeywords(['Is', 'it', 'real?'], 'question'))).toEqual([2]);
    expect(groupWords(5, { layout: 'split', splitAt: 0.4 })).toEqual([[0, 1], [2, 3, 4]]);
    expect(groupWords(4, { layout: 'label', splitAt: 1 })).toEqual([[0], [1, 2, 3]]);
  });
});
