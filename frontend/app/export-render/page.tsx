'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CaptionOverlay } from '@/components/captions/CaptionOverlay';
import { TextLayersOverlay } from '@/components/captions/TextLayersOverlay';
import { computeStack, DEFAULT_CAPTION_LAYER } from '@/lib/layers';
import { loadSegmenter, nextTimestamp, applyMatte } from '@/hooks/usePersonMask';

/** 'all' = one overlay; 'behind' / 'front' = the two overlays used when a person matte sits between them. */
type LayerPass = 'all' | 'behind' | 'front';
const inPass = (pass: LayerPass, layering?: string) => pass === 'all' || (layering === 'behind') === (pass === 'behind');
import { CaptionSegment, TextLayer } from '@/types/caption';
import { TemplateConfig, AspectRatio } from '@/types/template';
import { loadFontOnDemand } from '@/lib/fonts/fontLoader';
import { advancedNeedsFrame } from '@/lib/advanced/engine';

export interface ExportRenderPayload {
  segments: CaptionSegment[];
  templateConfig: TemplateConfig;
  textLayers?: TextLayer[];
  aspectRatio?: AspectRatio;
  width: number;
  height: number;
  scaleMultiplier?: number;
}

declare global {
  interface Window {
    __INIT_RENDER__?: (payload: ExportRenderPayload) => Promise<boolean>;
    __SEEK_TIME__?: (timeInSeconds: number) => Promise<{
      hasContent: boolean;
      isAnimating: boolean;
      stateKey: string;
    }>;
    __RENDER_READY__?: boolean;
    __SET_PASS__?: (pass: LayerPass) => Promise<void>;
    __SEGMENT_FRAME__?: (dataUrl: string) => Promise<{ matte: string; coverage: number }>;
  }
}

export default function ExportRenderPage() {
  const [config, setConfig] = useState<ExportRenderPayload | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the current config & time for synchronous access
  const configRef = useRef<ExportRenderPayload | null>(null);
  configRef.current = config;

  const [pass, setPass] = useState<LayerPass>('all');
  const passRef = useRef<LayerPass>('all');
  const timeRef = useRef<number>(0);
  timeRef.current = currentTime;

  useEffect(() => {
    // Ensure transparent background for clean frame capture
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';

    window.__INIT_RENDER__ = async (payload: ExportRenderPayload) => {
      setConfig(payload);
      configRef.current = payload;

      // Collect and preload all required fonts
      const fontsToLoad = new Set<string>();
      if (payload.templateConfig?.typography?.fontFamily) {
        fontsToLoad.add(payload.templateConfig.typography.fontFamily);
      }
      if (payload.templateConfig?.fontFamily) {
        fontsToLoad.add(payload.templateConfig.fontFamily);
      }
      const adv = payload.templateConfig?.advanced;
      if (adv) {
        [adv.keywordStyle, adv.support, adv.alternate, ...(adv.zones || [])].forEach((s) => {
          if (s?.font) fontsToLoad.add(s.font);
        });
      }

      (payload.segments || []).forEach((seg) => {
        if (seg.style_data?.font) fontsToLoad.add(seg.style_data.font);
        (seg.words || []).forEach((w) => {
          const wf = (w.styleOverrides as any)?.fontFamily || (w as any).fontFamily || (w as any).font;
          if (wf) fontsToLoad.add(wf);
        });
      });

      (payload.textLayers || []).forEach((layer) => {
        if (layer.style_data?.font) fontsToLoad.add(layer.style_data.font);
      });

      // Default safe font fallbacks
      fontsToLoad.add('Inter');
      fontsToLoad.add('Roboto');

      for (const fontName of Array.from(fontsToLoad)) {
        try {
          loadFontOnDemand(fontName);
        } catch {
          // ignore font load errors
        }
      }

      if (typeof document !== 'undefined' && document.fonts) {
        try {
          for (const fontName of Array.from(fontsToLoad)) {
            try {
              await document.fonts.load(`bold 48px "${fontName}"`);
              await document.fonts.load(`48px "${fontName}"`);
            } catch {
              // ignore
            }
          }
          await document.fonts.ready;
        } catch {
          // ignore
        }
      }

      // Pause to allow font layout repaint
      await new Promise((resolve) => setTimeout(resolve, 300));

      window.__RENDER_READY__ = true;
      return true;
    };

    window.__SET_PASS__ = async (p: LayerPass) => {
      passRef.current = p;
      setPass(p);
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    };

    // Same segmenter and matte maths as the preview. The frame arrives as an image, the matte leaves as a grey PNG.
    window.__SEGMENT_FRAME__ = async (dataUrl: string) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const segmenter = await loadSegmenter();
      const result = segmenter.segmentForVideo(c, nextTimestamp());
      const mask = result.confidenceMasks?.[0];
      if (!mask) throw new Error('Segmenter returned no mask');
      const frame = ctx.getImageData(0, 0, w, h);
      const coverage = applyMatte(frame.data, w, h, mask.getAsFloat32Array(), mask.width, mask.height);
      mask.close();
      result.close?.();
      for (let i = 0; i < frame.data.length; i += 4) {
        const a = frame.data[i + 3];
        frame.data[i] = a;
        frame.data[i + 1] = a;
        frame.data[i + 2] = a;
        frame.data[i + 3] = 255;
      }
      ctx.putImageData(frame, 0, 0);
      return { matte: c.toDataURL('image/png'), coverage };
    };

    window.__SEEK_TIME__ = async (timeInSeconds: number) => {
      timeRef.current = timeInSeconds;
      setCurrentTime(timeInSeconds);

      // Double requestAnimationFrame ensures full React flush and layout repaint
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      const currentCfg = configRef.current;
      if (!currentCfg) {
        return { hasContent: false, isAnimating: false, stateKey: 'empty' };
      }

      const pz = passRef.current;
      const capMeta: any = (currentCfg.segments || [])[0] && ((currentCfg.segments || [])[0] as any).caption_layer;
      const capInPass = inPass(pz, capMeta?.layering) && capMeta?.visible !== false;
      const activeSeg = capInPass
        ? (currentCfg.segments || []).find((s) => timeInSeconds >= s.start - 0.05 && timeInSeconds <= s.end + 0.05)
        : undefined;

      const hasVisibleTextLayers = (currentCfg.textLayers || []).some((l) => {
        if (l.visible === false || !inPass(pz, l.layering)) return false;
        if (l.startTime !== undefined && timeInSeconds < l.startTime) return false;
        if (l.endTime !== undefined && timeInSeconds > l.endTime) return false;
        return true;
      });

      const hasContent = Boolean(activeSeg || hasVisibleTextLayers);

      if (!activeSeg) {
        return {
          hasContent,
          isAnimating: false,
          stateKey: hasVisibleTextLayers ? `layers_${pz}_${timeInSeconds.toFixed(2)}` : 'empty',
        };
      }

      // Analyze if an animation is currently actively interpolating on this frame
      const animConfig = (activeSeg.animation_data || currentCfg.templateConfig?.animation || {}) as any;
      const entranceType = animConfig.entrance || animConfig.type || 'none';
      const entranceDur = animConfig.duration ?? 0.35;
      const hasEntrance = Boolean(entranceType && entranceType !== 'none');
      const isEntranceActive = hasEntrance && (timeInSeconds - activeSeg.start <= entranceDur + 0.05);

      const exitType = animConfig.exit || 'none';
      const hasExit = Boolean(exitType && exitType !== 'none');
      const isExitActive = hasExit && (activeSeg.end - timeInSeconds <= 0.2);

      const hasContinuous = Boolean(animConfig.loop && animConfig.loop !== 'none');
      // Advanced templates are fully time-based (fills, rails, travelling boxes), so never reuse frames.
      const isAnimating =
        isEntranceActive || isExitActive || hasContinuous || advancedNeedsFrame(currentCfg.templateConfig?.advanced);

      // Identify active word for karaoke state
      const words = activeSeg.words || [];
      const activeWordIdx = words.findIndex(
        (w) => w.start !== undefined && w.end !== undefined && timeInSeconds >= w.start && timeInSeconds <= w.end
      );

      const stateKey = `${pz}_${activeSeg.id}_w${activeWordIdx}${hasVisibleTextLayers ? '_layers' : ''}`;

      return {
        hasContent: true,
        isAnimating,
        stateKey,
      };
    };

    window.__RENDER_READY__ = true;

    return () => {
      delete window.__INIT_RENDER__;
      delete window.__SEEK_TIME__;
      delete window.__SET_PASS__;
      delete window.__SEGMENT_FRAME__;
      delete window.__RENDER_READY__;
    };
  }, []);

  if (!config) {
    return (
      <div
        id="export-canvas-container"
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  const activeSegment = (config.segments || []).find(
    (s) => currentTime >= s.start - 0.05 && currentTime <= s.end + 0.05
  ) || null;
  const passLayers = (config.textLayers || []).filter((l) => inPass(pass, l.layering));

  // Layer state travels on the segments (the export request passes segment fields through untouched).
  const captionMeta = { ...DEFAULT_CAPTION_LAYER, ...(((config.segments || [])[0] as any)?.caption_layer || {}) };
  // One numeric order for all layers; behind/front are rendered as separate passes so the person matte can sit between them.
  const stack = computeStack(captionMeta, config.textLayers || [], false);

  return (
    <div
      id="export-canvas-container"
      ref={containerRef}
      style={{
        width: `${config.width}px`,
        height: `${config.height}px`,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    >
      <style>{`
        *, *::before, *::after {
          transition-property: none !important;
          transition-duration: 0s !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
        }
      `}</style>
      <CaptionOverlay
        activeSegment={activeSegment}
        currentTime={currentTime}
        highlightEnabled={true}
        templateConfig={config.templateConfig}
        showSafeAreas={false}
        snapEnabled={false}
        containerRef={containerRef}
        scaleMultiplier={config.scaleMultiplier || 1.0}
        isExport={true}
        captionVisible={captionMeta.visible !== false && inPass(pass, captionMeta.layering)}
        captionZ={stack.captionZ}
      />
      <TextLayersOverlay
        layers={passLayers}
        currentTime={currentTime}
        templateConfig={config.templateConfig}
        containerRef={containerRef}
        scaleMultiplier={config.scaleMultiplier || 1.0}
        isExport={true}
        layerZ={stack.layerZ}
      />
    </div>
  );
}
