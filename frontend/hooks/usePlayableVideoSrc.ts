import { useEffect, useState } from 'react';

export type VideoLoadState = 'loading' | 'ready' | 'fallback';

/**
 * Preloads the video into a local Blob URL for instant, low-latency seeking and scrubbing.
 * If preloading cannot complete (or on slow connections), gracefully falls back to the
 * direct HTTP-streamed video URL (which supports HTTP 206 Partial Content byte ranges).
 */
export function usePlayableVideoSrc(remoteSrc: string) {
  const [src, setSrc] = useState<string>('');
  const [state, setState] = useState<VideoLoadState>('loading');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!remoteSrc) {
      setSrc('');
      setState('fallback');
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    setState('loading');
    setProgress(0);
    setSrc('');

    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('access_token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const res = await fetch(remoteSrc, { signal: controller.signal, headers });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}: ${res.statusText || 'Unable to fetch video'}`);
        }

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
            if (total && !cancelled) {
              setProgress(Math.round((received / total) * 100));
            }
          }
        }

        const contentType = res.headers.get('content-type') || 'video/mp4';
        const blob = new Blob(chunks, { type: contentType });
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setState('ready');
      } catch (err: any) {
        if (cancelled) return;
        console.warn('Falling back to streamed video (using backend range streaming):', err?.message || err);
        setSrc(remoteSrc);
        setState('fallback');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [remoteSrc]);

  return { src, state, progress };
}
