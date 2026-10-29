'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Looping playback clock for landing-page caption demos.
 * - Pauses while offscreen or when the tab is hidden.
 * - Under prefers-reduced-motion, holds a fixed readable frame instead of looping.
 */
export function useCaptionClock(loopSeconds: number, reducedMotionTime = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setTime(reducedMotionTime);
      return;
    }
    if (!visible) return;

    let raf = 0;
    let last = performance.now();
    let elapsed = time;
    let lastCommit = 0;

    const tick = (now: number) => {
      const delta = Math.min(now - last, 100);
      last = now;
      if (!document.hidden) {
        elapsed = (elapsed + delta / 1000) % loopSeconds;
        // ~30fps state updates are plenty for caption timing and keep React work low.
        if (now - lastCommit > 33) {
          lastCommit = now;
          setTime(elapsed);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, visible, loopSeconds, reducedMotionTime]);

  return { ref, time, reduced };
}

/** Observe an element's width so caption type can scale with its frame. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
