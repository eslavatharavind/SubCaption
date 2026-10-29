import { useEffect, useState } from 'react';

export type VideoLoadState = 'loading' | 'ready' | 'fallback';

/**
 * The backend serves project videos without HTTP Range support, so browsers cannot seek
 * inside them: any seek (or play after seeking) jumps back to 0:00. Loading the file once
 * into a Blob URL makes the whole video locally seekable without changing the backend.
 * If the download fails, the original URL is used so playback still works.
 */
export function usePlayableVideoSrc(remoteSrc: string) {
  const [src, setSrc] = useState<string>('');
  const [state, setState] = useState<VideoLoadState>('loading');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    setState('loading');
    setProgress(0);
    setSrc('');

    (async () => {
      try {
        const res = await fetch(remoteSrc, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (total && !cancelled) setProgress(Math.round((received / total) * 100));
          }
        }
        const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        console.warn('Falling back to streamed video (seeking may be limited):', err);
        setSrc(remoteSrc);
        setState('fallback');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [remoteSrc]);

  return { src, state, progress };
}
