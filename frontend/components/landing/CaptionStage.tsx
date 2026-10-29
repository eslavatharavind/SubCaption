'use client';

import { CaptionRenderer, CaptionWordItem } from '@/components/captions/CaptionRenderer';
import { TemplateConfig } from '@/types/template';

export interface TimedPhrase {
  text: string;
  /** Seconds the phrase stays on screen. */
  duration: number;
}

/** Spread word timings evenly across the phrase, leaving a short hold at the end. */
export function buildTimedWords(phrase: TimedPhrase): CaptionWordItem[] {
  const words = phrase.text.split(' ');
  const lead = 0.15;
  const speaking = Math.max(0.6, phrase.duration - lead - 0.7);
  const step = speaking / words.length;
  return words.map((text, i) => ({
    text,
    start: lead + i * step,
    end: lead + (i + 1) * step,
  }));
}

export function activeIndexAt(words: CaptionWordItem[], t: number): number {
  for (let i = words.length - 1; i >= 0; i--) {
    if (t >= (words[i].start ?? 0)) return i;
  }
  return -1;
}

interface CaptionStageProps {
  words: CaptionWordItem[];
  template: TemplateConfig;
  /** Seconds since this phrase started. */
  localTime: number;
  duration: number;
  scale: number;
}

export function CaptionStage({ words, template, localTime, duration, scale }: CaptionStageProps) {
  return (
    <CaptionRenderer
      words={words}
      template={template}
      activeWordIndex={activeIndexAt(words, localTime)}
      currentTime={localTime}
      segmentStart={0}
      segmentEnd={duration}
      frame={Math.floor(localTime * 30)}
      typewriterChars={Math.floor(localTime * 18)}
      scaleMultiplier={scale}
    />
  );
}
