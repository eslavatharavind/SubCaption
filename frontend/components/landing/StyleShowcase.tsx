'use client';

import { useMemo } from 'react';
import { getTemplateById } from '@/lib/templates';
import { TemplateConfig } from '@/types/template';
import { CaptionStage, TimedPhrase, buildTimedWords } from './CaptionStage';
import { useCaptionClock, useElementWidth } from './useCaptionClock';

const STYLE_IDS = [
  'caption-soft-glow',
  'caption-karaoke-bouncing-ball',
  'caption-slanted-banner',
  'caption-lower-third-slate',
  'caption-staggered-cascade',
  'caption-film-title',
];

const PHRASE: TimedPhrase = { text: 'Every word on time', duration: 3.6 };
const LOOP = PHRASE.duration + 0.6;

const pretty = (v?: string) =>
  v ? v.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—';

export function StyleCard({ template, time }: { template: TemplateConfig; time: number }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const words = useMemo(() => buildTimedWords(PHRASE), []);
  const local = Math.min(time, PHRASE.duration);
  const opacity = time > PHRASE.duration ? Math.max(0, 1 - (time - PHRASE.duration) / 0.3) : Math.min(1, time / 0.2);
  const scale = width ? Math.min(0.62, Math.max(0.42, width / 560)) : 0.5;

  return (
    <figure className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1116]">
      <div
        ref={ref}
        className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(165deg,#272E3A_0%,#141920_60%,#0D1015_100%)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(100%_60%_at_50%_100%,rgba(0,0,0,0.55),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-[16%] flex justify-center px-3 pointer-events-none" style={{ opacity }} aria-hidden="true">
          <CaptionStage words={words} template={template} localTime={local} duration={PHRASE.duration} scale={scale} />
        </div>
      </div>
      <figcaption className="flex items-start justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#E8ECF2]">{template.name}</p>
          <p className="truncate text-xs text-[#7C8696]">{template.category}</p>
        </div>
        <dl className="shrink-0 text-right text-[11px] leading-5 text-[#7C8696]">
          <div>
            <dt className="sr-only">Highlight</dt>
            <dd>{pretty(template.highlight?.mode)}</dd>
          </div>
          <div>
            <dt className="sr-only">Entrance</dt>
            <dd>{pretty(template.animation?.entrance)}</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}

export function StyleShowcase() {
  const templates = useMemo(() => STYLE_IDS.map((id) => getTemplateById(id)), []);
  const { ref, time } = useCaptionClock(LOOP, PHRASE.duration - 0.5);

  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <StyleCard key={t.id} template={t} time={time} />
      ))}
    </div>
  );
}

const LANG_SAMPLES = [
  { code: 'English', text: 'New ideas are changing everything' },
  { code: 'Telugu', text: 'కొత్త ఆలోచనలు ప్రపంచాన్ని మార్చుతున్నాయి' },
  { code: 'Hindi', text: 'नए विचार दुनिया को बदल रहे हैं' },
];

export function LanguageCard({ code, text, time }: { code: string; text: string; time: number }) {
  const template = useMemo(() => getTemplateById('caption-green-accent'), []);
  const phrase = useMemo(() => ({ text, duration: 3.6 }), [text]);
  const words = useMemo(() => buildTimedWords(phrase), [phrase]);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const local = Math.min(time, phrase.duration);
  const scale = width ? Math.min(0.58, Math.max(0.4, width / 600)) : 0.48;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1116]">
      <div ref={ref} className="relative flex min-h-[132px] items-center justify-center px-3 py-6" aria-hidden="true">
        <CaptionStage words={words} template={template} localTime={local} duration={phrase.duration} scale={scale} />
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-xs">
        <span className="font-medium text-[#E8ECF2]">{code}</span>
        <span className="text-[#7C8696]">{template.name}</span>
      </div>
      <p className="sr-only">{code} caption sample: {text}</p>
    </div>
  );
}

export function LanguageShowcase() {
  const { ref, time } = useCaptionClock(4.2, 3.0);
  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {LANG_SAMPLES.map((s) => (
        <LanguageCard key={s.code} code={s.code} text={s.text} time={time} />
      ))}
    </div>
  );
}
