import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

export type PersonMaskStatus = 'idle' | 'loading' | 'ready' | 'error';

const WASM_BASE = '/mediapipe/wasm';
const MODEL_URL = '/models/selfie_segmenter.tflite';
const MAX_DIM = 480; // segmentation resolution (longest side); the canvas is scaled up by CSS
const MIN_FRAME_MS = 40; // ~25 fps cap
const MASK_LOW = 0.3;
const MASK_HIGH = 0.7;

let segmenterPromise: Promise<any> | null = null;
let lastTimestamp = 0;

/** One shared segmenter for the whole page (model + WASM load once). */
export function loadSegmenter(): Promise<any> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      // The selfie model is tiny (256x256), so the CPU/WASM delegate is fast enough and, unlike the GPU
      // delegate, does not depend on WebGL support or a healthy GPU context (software GL took ~20s per start).
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })().catch((e) => {
      segmenterPromise = null;
      throw e;
    });
  }
  return segmenterPromise;
}

export const nextTimestamp = () => {
  lastTimestamp = Math.max(lastTimestamp + 1, Math.round(performance.now()));
  return lastTimestamp;
};

/**
 * Writes the matte into the alpha channel of RGBA pixels (shared by the preview and the exporter).
 * Returns the fraction of opaque pixels.
 */
export function applyMatte(px: Uint8ClampedArray, w: number, h: number, data: Float32Array, mw: number, mh: number): number {
  let on = 0;
  for (let y = 0; y < h; y++) {
    const my = mw === w && mh === h ? y : Math.min(mh - 1, Math.floor((y * mh) / h));
    for (let x = 0; x < w; x++) {
      const mx = mw === w && mh === h ? x : Math.min(mw - 1, Math.floor((x * mw) / w));
      const m = data[my * mw + mx];
      const a = m <= MASK_LOW ? 0 : m >= MASK_HIGH ? 255 : Math.round(((m - MASK_LOW) / (MASK_HIGH - MASK_LOW)) * 255);
      px[(y * w + x) * 4 + 3] = a;
      if (a > 127) on++;
    }
  }
  return on / (w * h);
}

/**
 * Real person segmentation for the preview. Draws the video frame onto `canvasRef` with an alpha matte so
 * only the person remains opaque; stacked above "behind" text it makes the text pass behind the person.
 * Never touches playback: it only reads the current frame.
 */
export function usePersonMask(videoRef: RefObject<HTMLVideoElement>, canvasRef: RefObject<HTMLCanvasElement>, enabled: boolean) {
  const [status, setStatus] = useState<PersonMaskStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const coverage = useRef(0);

  const retry = useCallback(() => {
    segmenterPromise = null;
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    const clear = () => {
      const c = canvasRef.current;
      c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    };
    if (!enabled) {
      clear();
      setStatus('idle');
      setError(null);
      return;
    }

    let cancelled = false;
    let handle = 0;
    let usingRvfc = false;
    let lastRun = 0;
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    const cleanups: Array<() => void> = [];
    setStatus('loading');
    setError(null);

    const fail = (e: unknown) => {
      if (cancelled) return;
      const msg = e instanceof Error ? e.message : String(e);
      setError(/security|tainted/i.test(msg) ? 'The video cannot be read for segmentation (cross-origin source).' : msg || 'Segmentation failed.');
      setStatus('error');
      clear();
    };

    loadSegmenter()
      .then((segmenter) => {
        if (cancelled || !tctx) return;
        // Stay in "loading" until a real matte has been drawn; only then report "ready".
        let produced = false;

        const run = () => {
          const v = videoRef.current;
          const out = canvasRef.current;
          if (!v || !out || cancelled || v.readyState < 2) return;
          if (!v.videoWidth) {
            fail(new Error('This browser cannot decode the video frames (unsupported video codec), so Behind Character cannot run.'));
            return;
          }
          const scale = Math.min(1, MAX_DIM / Math.max(v.videoWidth, v.videoHeight));
          const w = Math.max(2, Math.round(v.videoWidth * scale));
          const h = Math.max(2, Math.round(v.videoHeight * scale));
          if (tmp.width !== w || tmp.height !== h) {
            tmp.width = w;
            tmp.height = h;
          }
          if (out.width !== w || out.height !== h) {
            out.width = w;
            out.height = h;
          }
          try {
            tctx.drawImage(v, 0, 0, w, h);
            const result = segmenter.segmentForVideo(tmp, nextTimestamp());
            const mask = result.confidenceMasks?.[0];
            if (!mask) {
              result.close?.();
              return;
            }
            const data: Float32Array = mask.getAsFloat32Array();
            const mw = mask.width;
            const mh = mask.height;
            const frame = tctx.getImageData(0, 0, w, h);
            const px = frame.data;
            coverage.current = applyMatte(px, w, h, data, mw, mh);
            out.getContext('2d')?.putImageData(frame, 0, 0);
            mask.close();
            result.close?.();
            if (!produced) {
              produced = true;
              setStatus('ready');
            }
          } catch (e) {
            fail(e);
          }
        };

        const loop = () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (!v) return;
          const now = performance.now();
          if (now - lastRun >= MIN_FRAME_MS) {
            lastRun = now;
            run();
          }
          if (!v.paused && !v.ended) schedule();
        };
        const schedule = () => {
          const v = videoRef.current as any;
          if (!v) return;
          if (typeof v.requestVideoFrameCallback === 'function') {
            usingRvfc = true;
            handle = v.requestVideoFrameCallback(loop);
          } else {
            usingRvfc = false;
            handle = requestAnimationFrame(loop);
          }
        };

        const v = videoRef.current;
        if (v) {
          // Paused frames (seeking, scrubbing, first load) get one matte; playback keeps it updated.
          const once = () => run();
          const onPlay = () => schedule();
          (['seeked', 'loadeddata', 'pause', 'loadedmetadata'] as const).forEach((ev) => {
            v.addEventListener(ev, once);
            cleanups.push(() => v.removeEventListener(ev, once));
          });
          v.addEventListener('play', onPlay);
          cleanups.push(() => v.removeEventListener('play', onPlay));
          run();
          if (!v.paused) schedule();
        }
      })
      .catch(fail);

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      const v = videoRef.current as any;
      if (handle) {
        if (usingRvfc && v?.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle);
        else cancelAnimationFrame(handle);
      }
      clear();
    };
  }, [enabled, attempt, videoRef, canvasRef]);

  return { status, error, retry, coverage };
}
