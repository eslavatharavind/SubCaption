'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { TemplateConfig } from '@/types/template';
import { CaptionRenderer, CaptionWordItem } from '@/components/captions/CaptionRenderer';
import { useCaptionClock } from '@/components/landing/useCaptionClock';
import { buildTimedWords } from '@/components/landing/CaptionStage';

export interface LiveTemplatePreviewProps {
  template: TemplateConfig;
  previewText?: { line1: string; line2: string };
  isHovered?: boolean;
}

export function LiveTemplatePreview(props: LiveTemplatePreviewProps) {
  if (props.template.advanced) return <AdvancedLivePreview {...props} />;
  return <BasicLivePreview {...props} />;
}

/**
 * Advanced templates preview through the same time-based CaptionRenderer path used by the
 * editor and export, driven by a looping clock (pauses offscreen, honours reduced motion).
 */
function AdvancedLivePreview({ template, previewText }: LiveTemplatePreviewProps) {
  const text = previewText ? `${previewText.line1} ${previewText.line2}` : template.advanced!.sample;
  const phrase = useMemo(() => ({ text, duration: Math.max(2.4, text.split(' ').length * 0.42 + 0.8) }), [text]);
  const words = useMemo(() => buildTimedWords(phrase), [phrase]);
  const { ref, time } = useCaptionClock(phrase.duration + 0.7, phrase.duration - 0.3);
  const local = Math.min(time, phrase.duration);

  return (
    <div
      ref={ref}
      className="p-4 rounded-xl border border-[#262D36] text-center min-h-[150px] flex flex-col items-center justify-center relative overflow-hidden bg-[#0B0D10]/90"
    >
      <CaptionRenderer
        words={words}
        activeWordIndex={-1}
        template={template}
        currentTime={local}
        segmentStart={0}
        segmentEnd={phrase.duration}
        scaleMultiplier={0.4}
      />
    </div>
  );
}

function BasicLivePreview({
  template,
  previewText = { line1: 'New AI technology', line2: 'changing everything' },
  isHovered = false,
}: LiveTemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [frame, setFrame] = useState<number>(0);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [typewriterChars, setTypewriterChars] = useState<number>(0);

  // Performance: Intersection Observer to pause animation loops when offscreen
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const totalWords = (previewText.line1 + ' ' + previewText.line2).split(' ');
  const fullString = `${previewText.line1} ${previewText.line2}`;
  const wordItems: CaptionWordItem[] = totalWords.map((w) => ({ text: w }));

  // Programmatic Live Loop Animation Interval
  useEffect(() => {
    if (!isVisible) return;

    const intervalMs = isHovered ? 80 : 120;
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % 60);

      // Active Word / Karaoke loop (Cycles 0 to totalWords.length)
      setActiveWordIndex((prev) => (prev + 1) % (totalWords.length + 2));

      // Typewriter Character loop
      setTypewriterChars((prev) => (prev >= fullString.length + 5 ? 0 : prev + 1));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isVisible, isHovered, totalWords.length, fullString.length]);

  // Entrance animation transforms based on frame count
  const getEntranceTransform = () => {
    const entrance = template.animation?.entrance || 'none';
    const progress = (frame % 30) / 30; // 0 to 1 progress phase

    switch (entrance) {
      case 'pop':
      case 'bounce':
        const scale = 0.95 + Math.sin(progress * Math.PI) * 0.12;
        return `scale(${scale})`;
      case 'scale':
        return `scale(${0.9 + progress * 0.1})`;
      case 'slide-up':
        const translateY = (1 - progress) * -6;
        return `translateY(${translateY}px)`;
      case 'slide-right':
        const translateX = (1 - progress) * -8;
        return `translateX(${translateX}px)`;
      case 'fade':
      default:
        return 'scale(1.0)';
    }
  };

  return (
    <div
      ref={containerRef}
      className="p-4 rounded-xl border border-[#262D36] text-center min-h-[125px] flex flex-col items-center justify-center relative overflow-hidden bg-[#0B0D10]/90 group transition-all duration-200"
    >
      <div
        className="transition-transform duration-100 flex flex-col items-center justify-center w-full"
        style={{ transform: getEntranceTransform() }}
      >
        <CaptionRenderer
          words={wordItems}
          activeWordIndex={activeWordIndex}
          template={template}
          typewriterChars={typewriterChars}
          frame={frame}
          scaleMultiplier={0.38} // Scale font sizes down proportionally for preview cards
        />
      </div>
    </div>
  );
}
