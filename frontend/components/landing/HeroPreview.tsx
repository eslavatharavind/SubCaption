'use client';

import { useMemo } from 'react';
import { getTemplateById } from '@/lib/templates';
import { CaptionStage, TimedPhrase, buildTimedWords, activeIndexAt } from './CaptionStage';
import { useCaptionClock, useElementWidth } from './useCaptionClock';

const SCENES: { templateId: string; phrase: TimedPhrase }[] = [
  { templateId: 'caption-green-accent', phrase: { text: 'Captions that follow every word', duration: 3.4 } },
  { templateId: 'caption-karaoke-wave', phrase: { text: 'Sing along word by word', duration: 3.2 } },
  { templateId: 'caption-mask-wipe', phrase: { text: 'Reveal each line cleanly', duration: 3.0 } },
  { templateId: 'caption-cinematic-glow', phrase: { text: 'Or keep it cinematic', duration: 3.2 } },
];

const FADE = 0.22;

function useScenes() {
  const scenes = useMemo(
    () =>
      SCENES.map((s) => ({
        template: getTemplateById(s.templateId),
        phrase: s.phrase,
        words: buildTimedWords(s.phrase),
      })),
    []
  );
  const starts = useMemo(() => {
    let acc = 0;
    return scenes.map((s) => {
      const st = acc;
      acc += s.phrase.duration;
      return st;
    });
  }, [scenes]);
  const total = scenes.reduce((a, s) => a + s.phrase.duration, 0);
  return { scenes, starts, total };
}

export function HeroPreview() {
  const { scenes, total } = useScenes();
  // Reduced motion: hold the first scene with every word visible.
  const { ref, time } = useCaptionClock(total, scenes[0].phrase.duration - 0.8);
  return (
    <div ref={ref} className="w-full max-w-[300px] sm:max-w-[360px] mx-auto">
      <HeroPreviewFrame time={time} />
    </div>
  );
}

/** Renders the hero demo at an exact point in the loop. */
export function HeroPreviewFrame({ time }: { time: number }) {
  const { scenes, starts, total } = useScenes();
  const { ref: frameRef, width } = useElementWidth<HTMLDivElement>();

  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (time >= starts[i]) idx = i;
  const scene = scenes[idx];
  const local = time - starts[idx];
  const opacity = Math.max(0, Math.min(1, local / FADE, (scene.phrase.duration - local) / FADE));
  const scale = width ? Math.min(0.78, Math.max(0.5, width / 430)) : 0.62;
  const activeWord = activeIndexAt(scene.words, local);

  return (
    <>
      {/* 9:16 preview frame */}
      <div
        ref={frameRef}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0E1116] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        {/* Neutral scene backdrop (stands in for footage) */}
        <div className="absolute inset-0 bg-[linear-gradient(170deg,#2A3240_0%,#161B23_45%,#0C0F14_100%)]" />
        <div className="absolute inset-x-0 top-[38%] h-px bg-white/[0.06]" />
        <div className="absolute left-1/2 top-[22%] h-[34%] w-[46%] -translate-x-1/2 rounded-t-full bg-[linear-gradient(180deg,#3A4352_0%,#222936_100%)] opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_100%,rgba(0,0,0,0.65),transparent_60%)]" />

        {/* Preset label */}
        <div className="absolute left-3 top-3 right-3 flex items-center justify-between text-[10px] font-medium tracking-wide">
          <span className="rounded-md bg-black/45 px-2 py-1 text-white/85 backdrop-blur-sm">
            {scene.template.name}
          </span>
          <span className="rounded-md bg-black/45 px-2 py-1 font-mono text-white/60 backdrop-blur-sm">9:16</span>
        </div>

        {/* Caption, positioned like the editor's lower-third default */}
        <div
          className="absolute inset-x-0 top-[66%] flex justify-center px-3 pointer-events-none"
          style={{ opacity }}
          aria-hidden="true"
        >
          <CaptionStage
            words={scene.words}
            template={scene.template}
            localTime={local}
            duration={scene.phrase.duration}
            scale={scale}
          />
        </div>
        <p className="sr-only">Caption preview: {scene.phrase.text}</p>
      </div>

      {/* Timeline strip synced to the same clock */}
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0E1116] p-2.5" aria-hidden="true">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-[#7C8696]">
          <span>{time.toFixed(1)}s</span>
          <span>{total.toFixed(1)}s</span>
        </div>
        <div className="relative h-7">
          {scenes.map((s, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex gap-px overflow-hidden rounded-md"
              style={{ left: `${(starts[i] / total) * 100}%`, width: `calc(${(s.phrase.duration / total) * 100}% - 3px)` }}
            >
              {s.words.map((w, wi) => {
                const on = i === idx && wi === activeWord;
                const past = i < idx || (i === idx && wi < activeWord);
                return (
                  <div
                    key={wi}
                    className={`flex-1 transition-colors duration-150 ${
                      on ? 'bg-[#3B82F6]' : past ? 'bg-[#3B82F6]/35' : 'bg-white/[0.07]'
                    }`}
                  />
                );
              })}
            </div>
          ))}
          <div
            className="absolute -top-1 -bottom-1 w-px bg-white"
            style={{ left: `${(time / total) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}
