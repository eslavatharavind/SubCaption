'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { EditorTimeline, TimelineLayerBar } from '@/components/editor/EditorTimeline';
import { LayersPanel } from '@/components/editor/LayersPanel';
import {
  CAPTION_LAYER_ID,
  DEFAULT_CAPTION_LAYER,
  computeStack,
  layerDisplayName,
  loadLayers,
  reorderLayers,
  saveLayers,
  uniqueLayerName,
} from '@/lib/layers';
import type { PersonMaskStatus } from '@/hooks/usePersonMask';
import { transcriptionApi, captionsApi, templatesApi, exportsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { CaptionSegment, CaptionWord, StyleData, PositionData, AnimationData, AnimationConfig, TextLayer, CaptionLayerMeta, LayerLayering } from '@/types';
import {
  PRIMARY_ENTRANCE_PRESETS,
  PRIMARY_WORD_PRESETS,
  PRIMARY_KARAOKE_PRESETS,
  PRIMARY_EMPHASIS_PRESETS,
  PRIMARY_EXIT_PRESETS,
  PRIMARY_LOOP_PRESETS,
  ADVANCED_CHARACTER_PRESETS,
  ADVANCED_MOTION_PRESETS,
  ADVANCED_REVEAL_PRESETS,
  CREATIVE_EFFECT_PRESETS,
} from '@/lib/animations/animationPresets';

import { useVideo } from '@/hooks/useVideo';
import { usePlayableVideoSrc } from '@/hooks/usePlayableVideoSrc';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { FONT_LIBRARY, FontItem } from '@/constants/fonts';
import { loadFontOnDemand } from '@/lib/fonts/fontLoader';
import { ALL_TEMPLATES, BASIC_TEMPLATES, ADVANCED_TEMPLATES, getCategoriesForTier, TemplateTier } from '@/lib/templates';
import { TemplateConfig, TemplateCategory, AspectRatio } from '@/types/template';
import { LiveTemplatePreview } from '@/components/templates/LiveTemplatePreview';
import { CaptionWordSelector } from '@/components/captions/CaptionWordSelector';
import { POSITION_PRESETS, resolvePosition, SAFE_ZONES, detectClosestAspectRatio } from '@/lib/positionSystem';

interface EditorPageProps {
  params: { projectId: string };
}

import { LanguageCode, CAPTION_OUTPUT_MODES } from '@/types/project';

const LANGUAGE_LABELS: Record<string, { name: string; flag: string }> = {
  te: { name: 'Telugu', flag: '🇮🇳' },
  te_en: { name: 'Telugu + English', flag: '🇮🇳' },
  en: { name: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  te_roman: { name: 'Telugu English Letters', flag: '🔤' },
};

type ActiveTabType = 'captions' | 'templates' | 'fonts' | 'text' | 'highlight' | 'animation' | 'position' | 'layers';

// Only presets the animation engine and renderer actually implement are offered in the editor.
const ENTRANCE_PRESETS = PRIMARY_ENTRANCE_PRESETS.filter((p) => p.id !== 'typewriter');
const WORD_PRESETS = PRIMARY_WORD_PRESETS.filter((p) => ['none', 'word-by-word'].includes(p.id));
const CHARACTER_PRESETS = ADVANCED_CHARACTER_PRESETS.filter((p) => ['char-fade', 'char-pop', 'char-bounce'].includes(p.id));
const MOTION_PRESETS = ADVANCED_MOTION_PRESETS.filter((p) => !['orbit-motion', 'swing-motion', 'elastic-motion', 'spring-motion'].includes(p.id));
const CREATIVE_PRESETS = CREATIVE_EFFECT_PRESETS.filter((p) => ['none', 'rgb-split', 'digital-glitch', 'vhs', 'neon-flicker-effect'].includes(p.id));

export default function EditorPage({ params }: EditorPageProps) {
  const projectId = params.projectId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [projectName, setProjectName] = useState<string>(searchParams.get('filename') || 'AI Video Project');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const initialLanguage = (searchParams.get('language') as LanguageCode) || 'en';
  const [currentCaptionMode, setCurrentCaptionMode] = useState<LanguageCode>(initialLanguage);
  const [isChangingMode, setIsChangingMode] = useState<boolean>(false);
  const [modeError, setModeError] = useState<string | null>(null);

  // Video & Playback State
  const videoRef = useRef<HTMLVideoElement>(null);
  const { playback, handleTimeUpdate, handleLoadedMetadata, togglePlay, seekTo, startSeeking, endSeeking } = useVideo(videoRef);

  // Active Left Sidebar Tab
  const [activeTab, setActiveTab] = useState<ActiveTabType>('captions');

  // Captions & Selection
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Highlight State
  const [highlightEnabled, setHighlightEnabled] = useState<boolean>(true);

  // ---- Layers: the caption track plus user text layers share one stacking order ----
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [captionLayer, setCaptionLayer] = useState<CaptionLayerMeta>(DEFAULT_CAPTION_LAYER);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const selectedTextLayerId = selectedLayerId && selectedLayerId !== CAPTION_LAYER_ID ? selectedLayerId : null;
  const [layersLoaded, setLayersLoaded] = useState<boolean>(false);
  const [captionsLoaded, setCaptionsLoaded] = useState<boolean>(false);
  const [personMask, setPersonMask] = useState<{ status: PersonMaskStatus; error: string | null; retry: () => void }>({
    status: 'idle',
    error: null,
    retry: () => {},
  });

  // Layers are kept on this device (the save API only stores captions).
  useEffect(() => {
    const saved = loadLayers(projectId);
    if (saved) {
      setCaptionLayer(saved.caption);
      setTextLayers(saved.layers);
    }
    setLayersLoaded(true);
  }, [projectId]);
  useEffect(() => {
    if (layersLoaded) saveLayers(projectId, { caption: captionLayer, layers: textLayers });
  }, [layersLoaded, captionLayer, textLayers, projectId]);

  const stack = useMemo(() => computeStack(captionLayer, textLayers, true), [captionLayer, textLayers]);

  const handleAddTextLayer = () => {
    const names = [captionLayer.name, ...textLayers.map(layerDisplayName)];
    const name = uniqueLayerName('Text layer', names);
    const topZ = Math.max(captionLayer.zIndex, ...textLayers.map((l) => l.zIndex)) + 1;
    const newLayer: TextLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      text: 'Your text',
      zIndex: topZ,
      layering: 'front',
      locked: false,
      visible: true,
      startTime: 0,
      endTime: playback.duration > 0 ? Math.round(playback.duration * 100) / 100 : undefined,
      position_data: {
        x: 0.5,
        y: Math.max(0.15, Math.min(0.85, 0.35 + ((textLayers.length % 5) * 0.12))),
        anchorX: 'center',
        anchorY: 'center',
        custom: true,
      },
      style_data: {
        font: activeTemplate.fontFamily || 'Inter',
        fontSize: 48,
        fontWeight: 700,
        textColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
        background: 'transparent',
      },
      animation_data: { type: 'none' },
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleUpdateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers((prev) => prev.map((l) => (l.id === id && !l.locked ? { ...l, ...updates } : l)));
  };

  const handleDeleteLayer = (id: string) => {
    const layer = textLayers.find((l) => l.id === id);
    if (!layer || layer.locked) return;
    setTextLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedLayerId((cur) => (cur === id ? null : cur));
  };

  const handleRenameLayer = (id: string, name: string) => {
    if (id === CAPTION_LAYER_ID) setCaptionLayer((c) => ({ ...c, name }));
    else setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  };

  const handleToggleLayerVisible = (id: string) => {
    if (id === CAPTION_LAYER_ID) setCaptionLayer((c) => ({ ...c, visible: !c.visible }));
    else setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: l.visible === false } : l)));
  };

  const handleToggleLayerLock = (id: string) => {
    if (id === CAPTION_LAYER_ID) setCaptionLayer((c) => ({ ...c, locked: !c.locked }));
    else setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
  };

  const handleSetLayering = (id: string, layering: LayerLayering) => {
    if (id === CAPTION_LAYER_ID) setCaptionLayer((c) => (c.locked ? c : { ...c, layering }));
    else setTextLayers((prev) => prev.map((l) => (l.id === id && !l.locked ? { ...l, layering } : l)));
  };

  const handleReorderLayers = (frontToBack: string[]) => {
    const r = reorderLayers(captionLayer, textLayers, frontToBack);
    setCaptionLayer(r.caption);
    setTextLayers(r.layers);
  };

  const handleUpdateTextLayerPosition = (id: string, pos: any) => {
    setTextLayers((prev) =>
      prev.map((l) => (l.id === id && !l.locked ? { ...l, position_data: { ...l.position_data, ...pos, custom: true } } : l))
    );
  };

  const handleUpdateLayerTiming = (id: string, start: number, end: number) => {
    setTextLayers((prev) => prev.map((l) => (l.id === id && !l.locked ? { ...l, startTime: start, endTime: end } : l)));
  };

  const handleSelectLayerFromCanvasOrTimeline = (id: string) => {
    setSelectedLayerId(id);
    setActiveTab('layers');
  };

  // Transcribe Loading State
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Active Template, Aspect Ratio & Search Filters
  const [templateCategory, setTemplateCategory] = useState<string>('All');
  const [templateTier, setTemplateTier] = useState<TemplateTier>('basic');
  const [fontCategory, setFontCategory] = useState<string>('All');
  const [fontSearchQuery, setFontSearchQuery] = useState<string>('');
  const [fontApplyScope, setFontApplyScope] = useState<'all' | 'word'>('all');
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectedHighlightWordIndex, setSelectedHighlightWordIndex] = useState<number | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('9:16');
  const [hasUserChangedAspectRatio, setHasUserChangedAspectRatio] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialLoad = useRef<boolean>(true);
  const [timelineZoom, setTimelineZoom] = useState<number>(80); // pixels per second
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<TemplateConfig>(ALL_TEMPLATES[0]);

  // Position Panel State
  const [positionApplyScope, setPositionApplyScope] = useState<'current' | 'all' | 'word'>('current');
  const [selectedPositionWordIndex, setSelectedPositionWordIndex] = useState<number | null>(null);
  const [selectedPositionPhraseRange, setSelectedPositionPhraseRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [snapGuidesEnabled, setSnapGuidesEnabled] = useState<boolean>(true);
  const [showSafeAreasEnabled, setShowSafeAreasEnabled] = useState<boolean>(true);

  // Animation Panel State
  const [animLevelTab, setAnimLevelTab] = useState<'primary' | 'advanced' | 'controls' | 'motion'>('primary');
  const [animPrimaryCategory, setAnimPrimaryCategory] = useState<'entrance' | 'word' | 'karaoke' | 'impact' | 'exit' | 'loop'>('entrance');
  const [animAdvancedCategory, setAnimAdvancedCategory] = useState<'character' | 'motion' | 'reveal' | 'creative'>('character');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportResolution, setExportResolution] = useState<'720p' | '1080p'>('1080p');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStepText, setExportStepText] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [currentExportId, setCurrentExportId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const exportPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clear export polling timer on unmount
  useEffect(() => {
    return () => {
      if (exportPollingRef.current) {
        clearInterval(exportPollingRef.current);
      }
    };
  }, []);

  const videoSrc = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/projects/${projectId}/video`;
  // Seekable local copy of the video (fixes seek/pause jumping back to 0:00).
  const { src: playableVideoSrc, state: videoLoadState, progress: videoLoadProgress } = usePlayableVideoSrc(videoSrc);

  // Undo / Redo over captions and text layers (playback time is never recorded).
  // "ready" holds back the baseline until captions and saved layers have both loaded, so loading is never undoable.
  const historyReady = captionsLoaded && layersLoaded;
  const historyDoc = useMemo(
    () => ({ segments, textLayers, captionLayer, ready: historyReady }),
    [segments, textLayers, captionLayer, historyReady]
  );
  const applyHistory = useCallback(
    (doc: { segments: CaptionSegment[]; textLayers: TextLayer[]; captionLayer: CaptionLayerMeta; ready: boolean }) => {
      setSegments(doc.segments);
      setTextLayers(doc.textLayers);
      setCaptionLayer(doc.captionLayer);
    },
    []
  );
  const { undo, redo, canUndo, canRedo } = useEditorHistory(historyDoc, applyHistory, (doc) => !doc.ready);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing || !(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Unsaved-change protection: autosave is pending or failed.
  const hasUnsavedChanges = saveStatus === 'saving' || saveStatus === 'error';
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveNow = async () => {
    if (segments.length === 0) return;
    setSaveStatus('saving');
    try {
      await captionsApi.updateAll(projectId, segments);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    fetchCaptions();
  }, [projectId]);

  // Debounced Auto-Save System
  useEffect(() => {
    if (isInitialLoad.current) {
      if (segments.length > 0) {
        isInitialLoad.current = false;
      }
      return;
    }
    if (!segments || segments.length === 0) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await captionsApi.updateAll(projectId, segments);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [segments, projectId]);

  const handleVideoDimensions = (vw: number, vh: number) => {
    if (!hasUserChangedAspectRatio && vw && vh) {
      const detected = detectClosestAspectRatio(vw, vh);
      setSelectedAspectRatio(detected);
    }
  };

  // Follow playhead with auto-scroll during playback
  useEffect(() => {
    if (!playback.isPlaying || !timelineScrollRef.current) return;
    const playheadPx = playback.currentTime * timelineZoom;
    const scrollLeft = timelineScrollRef.current.scrollLeft;
    const clientWidth = timelineScrollRef.current.clientWidth;
    if (playheadPx > scrollLeft + clientWidth - 80) {
      timelineScrollRef.current.scrollLeft = playheadPx - clientWidth / 2;
    } else if (playheadPx < scrollLeft + 40) {
      timelineScrollRef.current.scrollLeft = Math.max(0, playheadPx - 80);
    }
  }, [playback.currentTime, playback.isPlaying, timelineZoom]);

  const fetchCaptions = async () => {
    try {
      const res = await captionsApi.list(projectId);
      if (res.data?.segments && res.data.segments.length > 0) {
        setSegments(res.data.segments);
        setSelectedSegmentId(res.data.segments[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch captions:', err);
    } finally {
      setCaptionsLoaded(true);
    }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    setTranscribeError(null);
    try {
      const res = await transcriptionApi.transcribe(projectId, initialLanguage);
      if (res.data?.segments) {
        setSegments(res.data.segments);
        if (res.data.segments.length > 0) {
          setSelectedSegmentId(res.data.segments[0].id);
        }
      }
    } catch (err: any) {
      console.error('Transcribe error:', err);
      const errMsg = err.message || 'Transcription failed. Please check backend connection.';
      setTranscribeError(errMsg);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleModeChange = async (newMode: LanguageCode) => {
    if (isChangingMode || newMode === currentCaptionMode) return;
    setIsChangingMode(true);
    setModeError(null);
    try {
      const res = await captionsApi.changeMode(projectId, newMode);
      if (res.data?.segments && res.data.segments.length > 0) {
        setSegments(res.data.segments);
        setCurrentCaptionMode(newMode);
        if (!selectedSegmentId && res.data.segments.length > 0) {
          setSelectedSegmentId(res.data.segments[0].id);
        }
      } else if (res.data?.message) {
        setModeError(res.data.message);
      }
    } catch (err: any) {
      console.error('Failed to change caption mode:', err);
      setModeError('Unable to generate this caption mode. Your original transcription is still available.');
    } finally {
      setIsChangingMode(false);
    }
  };

  const activeSegment = (function() {
    const matched = segments.find(
      (seg) => playback.currentTime >= seg.start && playback.currentTime < seg.end
    );
    if (matched) return matched;
    const tolerantMatch = segments.find(
      (seg) => playback.currentTime >= (seg.start - 0.05) && playback.currentTime <= (seg.end + 0.05)
    );
    if (tolerantMatch) return tolerantMatch;
    if (!playback.isPlaying && selectedSegmentId) {
      const sel = segments.find((seg) => seg.id === selectedSegmentId) || null;
      if (sel && playback.currentTime >= sel.start && playback.currentTime <= sel.end) {
        return sel;
      }
    }
    return null;
  })();

  const selectedSegment = segments.find((seg) => seg.id === selectedSegmentId) || activeSegment;

  const handleUpdateSegmentText = (text: string) => {
    if (!selectedSegment) return;
    const textWords = text.trim().split(/\s+/).filter(Boolean);
    const duration = Math.max(0.1, selectedSegment.end - selectedSegment.start);
    const step = duration / Math.max(1, textWords.length);

    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (seg.id !== selectedSegment.id) return seg;
        const updatedWords: CaptionWord[] = textWords.map((token, i) => {
          const existing = seg.words && seg.words[i];
          return {
            ...(existing || {}),
            text: token,
            start: existing?.start ?? (seg.start + i * step),
            end: existing?.end ?? (seg.start + (i + 1) * step),
          };
        });
        return {
          ...seg,
          text,
          words: updatedWords,
        };
      })
    );
  };

  const handleUpdateSegmentTiming = (segmentId: string, start: number, end: number) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== segmentId) return seg;
        const oldLen = Math.max(0.01, seg.end - seg.start);
        const k = (end - start) / oldLen;
        const words = (seg.words || []).map((w) => ({
          ...w,
          start: w.start !== undefined ? start + (w.start - seg.start) * k : w.start,
          end: w.end !== undefined ? start + (w.end - seg.start) * k : w.end,
        }));
        return { ...seg, start, end, words };
      })
    );
  };

  const handleDeleteSegment = async (segmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSegments((prevSegments) => {
      const updated = prevSegments.filter((s) => s.id !== segmentId);
      return updated;
    });
    if (selectedSegmentId === segmentId) {
      const remaining = segments.filter((s) => s.id !== segmentId);
      setSelectedSegmentId(remaining.length > 0 ? remaining[0].id : null);
    }
    try {
      await captionsApi.delete(projectId, segmentId);
    } catch (err) {
      console.warn('Backend delete segment failed, fallback to updateAll:', err);
    }
  };

  const handleUpdateStyle = (newStyle: Partial<StyleData>, applyToAll: boolean = true) => {
    // Functional updates so a style change never overwrites a highlight/word update made in the same click.
    if (applyToAll) {
      setSegments((prev) => prev.map((seg) => ({
        ...seg,
        style_data: { ...seg.style_data, ...newStyle }
      })));
    } else if (selectedSegment) {
      const targetId = selectedSegment.id;
      setSegments((prev) => prev.map((seg) =>
        seg.id === targetId
          ? { ...seg, style_data: { ...seg.style_data, ...newStyle } }
          : seg
      ));
    }
  };

  const handleResetSection = (keysToReset: (keyof StyleData)[], applyToAll: boolean = true) => {
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
          return seg;
        }
        const updatedStyle = { ...seg.style_data };
        keysToReset.forEach((k) => {
          delete updatedStyle[k];
        });
        return {
          ...seg,
          style_data: updatedStyle,
        };
      })
    );
  };

  const isSectionModified = (keys: (keyof StyleData)[]): boolean => {
    if (!selectedSegment?.style_data) return false;
    return keys.some((k) => selectedSegment.style_data[k] !== undefined);
  };

  const handleUpdateHighlight = (newHighlight: Partial<any>, applyToAll: boolean = true) => {
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
          return seg;
        }
        const currentHighlight = seg.highlight_data || { mode: 'active-word' };
        return {
          ...seg,
          highlight_data: {
            ...currentHighlight,
            ...newHighlight,
          },
        };
      })
    );
  };

  const handleUpdateWordTarget = (
    wordIndex: number,
    wordText: string,
    targetOverrides: any,
    emphasisOverrides?: any,
    timingOverrides?: any
  ) => {
    if (!selectedSegment) return;
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (seg.id !== selectedSegment.id) return seg;
        const currentHighlight = seg.highlight_data || { mode: 'keyword', targets: [] };
        const existingTargets = currentHighlight.targets || [];
        const existingIdx = existingTargets.findIndex((t) => t.wordIndex === wordIndex);

        let updatedTargets = [...existingTargets];
        if (existingIdx >= 0) {
          const currentTarget = existingTargets[existingIdx];
          updatedTargets[existingIdx] = {
            ...currentTarget,
            styleOverrides: {
              ...currentTarget.styleOverrides,
              ...targetOverrides,
            },
            emphasis: {
              ...currentTarget.emphasis,
              ...emphasisOverrides,
            },
            timing: {
              ...currentTarget.timing,
              ...timingOverrides,
            },
          };
        } else {
          updatedTargets.push({
            wordIndex,
            wordText,
            segmentId: seg.id,
            styleOverrides: targetOverrides,
            emphasis: emphasisOverrides,
            timing: timingOverrides,
            source: 'manual',
          });
        }

        return {
          ...seg,
          highlight_data: {
            ...currentHighlight,
            targets: updatedTargets,
          },
        };
      })
    );
  };

  const handleSelectPhrase = (segmentId: string, startIndex: number, endIndex: number) => {
    const targetSeg = segments.find((s) => s.id === segmentId) || selectedSegment;
    if (!targetSeg || !targetSeg.words) return;
    for (let i = startIndex; i <= endIndex; i++) {
      const word = targetSeg.words[i];
      if (word) {
        handleUpdateWordTarget(
          i,
          word.text,
          {
            textColor: targetSeg.highlight_data?.color || targetSeg.style_data?.highlightColor || '#FFD600',
            scale: targetSeg.highlight_data?.scale || 120,
          }
        );
      }
    }
  };

  const handleResetHighlightTarget = (wordIndex?: number) => {
    if (!selectedSegment) return;
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (seg.id !== selectedSegment.id) return seg;
        const currentHighlight = seg.highlight_data || { mode: 'active-word', targets: [] };
        if (wordIndex === undefined) {
          return {
            ...seg,
            highlight_data: {
              mode: 'active-word',
              targets: [],
            },
          };
        }
        const updatedTargets = (currentHighlight.targets || []).filter((t) => t.wordIndex !== wordIndex);
        return {
          ...seg,
          highlight_data: {
            ...currentHighlight,
            targets: updatedTargets,
          },
        };
      })
    );
  };

  const handleUpdatePosition = (
    newPos: Partial<PositionData> | PositionData['position'],
    scope: 'all' | 'current' | 'word' | boolean = positionApplyScope
  ) => {
    let resolvedScope: 'all' | 'current' | 'word';
    if (typeof scope === 'boolean') {
      resolvedScope = scope ? 'all' : 'current';
    } else {
      resolvedScope = scope;
    }

    let updatedPos: Partial<PositionData>;
    if (typeof newPos === 'string') {
      const preset = POSITION_PRESETS.find((p) => p.id === newPos);
      if (preset) {
        updatedPos = {
          position: preset.id,
          preset: preset.id,
          x: preset.x,
          y: preset.y,
          anchorX: preset.anchorX,
          anchorY: preset.anchorY,
          custom: false,
        };
      } else {
        updatedPos = { position: newPos as any, custom: false };
      }
    } else {
      updatedPos = newPos || {};
    }

    // If word/phrase scope is selected and a word/phrase is active:
    if (resolvedScope === 'word' && selectedPositionWordIndex !== null && selectedSegment) {
      const wIdx = selectedPositionWordIndex;
      const isPhrase = selectedPositionPhraseRange !== null;
      const start = isPhrase ? selectedPositionPhraseRange.startIndex : wIdx;
      const end = isPhrase ? selectedPositionPhraseRange.endIndex : wIdx;
      const phraseGroupId = isPhrase ? `${selectedSegment.id}_p_${start}_${end}` : undefined;

      setSegments((prevSegments) =>
        prevSegments.map((seg) => {
          if (seg.id !== selectedSegment.id) return seg;
          const updatedWords = (seg.words || []).map((w, idx) => {
            if (idx >= start && idx <= end) {
              return {
                ...w,
                position_data: {
                  ...(w.position_data || seg.position_data || {}),
                  ...updatedPos,
                },
                phraseGroupId,
              };
            }
            return w;
          });
          return {
            ...seg,
            words: updatedWords,
          };
        })
      );
      return;
    }

    const applyToAll = resolvedScope === 'all';
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
          return seg;
        }
        return {
          ...seg,
          position_data: {
            ...seg.position_data,
            ...updatedPos,
          },
        };
      })
    );
  };

  const handleUpdateWordPosition = (
    target: {
      segmentId: string;
      wordIndex: number;
      wordId?: string;
      phraseStartIndex?: number;
      phraseEndIndex?: number;
    },
    newPos: Partial<PositionData>
  ) => {
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (seg.id !== target.segmentId) return seg;
        const isPhrase =
          target.phraseStartIndex !== undefined && target.phraseEndIndex !== undefined;
        const start = isPhrase ? target.phraseStartIndex! : target.wordIndex;
        const end = isPhrase ? target.phraseEndIndex! : target.wordIndex;
        const phraseGroupId = isPhrase ? `${seg.id}_p_${start}_${end}` : undefined;

        const updatedWords = (seg.words || []).map((w, idx) => {
          if (idx >= start && idx <= end) {
            return {
              ...w,
              position_data: {
                ...(w.position_data || seg.position_data || {}),
                ...newPos,
              },
              phraseGroupId,
            };
          }
          return w;
        });

        return {
          ...seg,
          words: updatedWords,
        };
      })
    );
  };

  const handleResetWordPosition = (segmentId: string, wordIndex: number) => {
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (seg.id !== segmentId) return seg;
        const isPhrase = selectedPositionPhraseRange !== null;
        const start = isPhrase ? selectedPositionPhraseRange.startIndex : wordIndex;
        const end = isPhrase ? selectedPositionPhraseRange.endIndex : wordIndex;

        const updatedWords = (seg.words || []).map((w, idx) => {
          if (idx >= start && idx <= end) {
            const { position_data, phraseGroupId, ...rest } = w;
            return rest;
          }
          return w;
        });

        return {
          ...seg,
          words: updatedWords,
        };
      })
    );
    setSelectedPositionWordIndex(null);
    setSelectedPositionPhraseRange(null);
  };

  const handleResetPosition = (applyToAll: boolean = true) => {
    const templatePos = (activeTemplate.position?.anchor as any) || 'bottom-center';
    const defPreset = POSITION_PRESETS.find((p) => p.id === templatePos) || POSITION_PRESETS[7];

    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
          return seg;
        }
        const cleanedWords = (seg.words || []).map((w) => {
          const { position_data, phraseGroupId, ...rest } = w;
          return rest;
        });

        return {
          ...seg,
          words: cleanedWords,
          position_data: {
            position: defPreset.id,
            offsetY: 0,
            x: defPreset.x,
            y: defPreset.y,
            anchorX: defPreset.anchorX,
            anchorY: defPreset.anchorY,
            custom: false,
          },
        };
      })
    );
    setSelectedPositionWordIndex(null);
    setSelectedPositionPhraseRange(null);
  };

  const handleUpdateAnimation = (newAnim: Partial<AnimationConfig>, applyToAll: boolean = true) => {
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
          return seg;
        }
        const currentAnim = seg.animation_data || {};
        return {
          ...seg,
          animation_data: {
            ...currentAnim,
            ...newAnim,
            type: (newAnim.entrance || newAnim.type || currentAnim.type || 'none') as any,
          },
        };
      })
    );

    if (selectedSegment) {
      seekTo(selectedSegment.start + 0.05);
    }
  };

  const handleResetAnimation = (applyToAll: boolean = true) => {
    setSegments((prevSegments) =>
      prevSegments.map((seg) => {
        if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
          return seg;
        }
        const activeTemplateAnim = (typeof activeTemplate.animation === 'object' ? activeTemplate.animation : { type: activeTemplate.animation || 'none' }) || {};
        return {
          ...seg,
          animation_data: { ...activeTemplateAnim },
        };
      })
    );
  };

  const handleApplyFullTemplate = async (template: TemplateConfig, applyToAll: boolean = true) => {
    setActiveTemplate(template);

    const font = template.typography?.fontFamily || template.fontFamily || 'Inter';
    const fontSize = template.typography?.fontSize || template.fontSize || 48;
    const fontWeight = template.typography?.fontWeight || template.fontWeight || 700;
    const textColor = template.colors?.primaryTextColor || template.textColor || '#FFFFFF';
    const highlightColor = template.colors?.highlightColor || template.highlightColor || '#FFD600';
    const background = typeof template.background === 'object'
      ? (template.background.color || 'transparent')
      : (template.background || 'transparent');
    const strokeWidth = template.stroke?.width || (template.stroke ? 2 : 0);
    const strokeColor = template.stroke?.color || '#000000';
    const shadow = template.shadow?.enabled ?? template.shadow ?? false;

    const updatedStyleData: Partial<StyleData> = {
      font,
      fontSize,
      fontWeight,
      textColor,
      highlightColor,
      background,
      strokeWidth,
      strokeColor,
      shadow,
    };

    const updated = segments.map((seg) => {
      if (!applyToAll && selectedSegment && seg.id !== selectedSegment.id) {
        return seg;
      }
      return {
        ...seg,
        style_data: {
          ...seg.style_data,
          ...updatedStyleData,
        },
        position_data: {
          ...seg.position_data,
          position: (template.position?.anchor as any) || 'bottom-center',
        },
        animation_data: {
          ...seg.animation_data,
          type: (template.animation?.entrance as any) || 'pop',
        }
      };
    });

    setSegments(updated);

    try {
      await templatesApi.apply(projectId, template.id);
    } catch (err) {
      console.error('Failed to save template selection to backend:', err);
    }
  };

  // Split happens in the editor (undoable, persisted by the normal autosave): the backend split endpoint
  // requires a `word_index` this client never sent and otherwise always cuts at the middle.
  // Splits at the playhead when it is inside the caption, otherwise at the middle word.
  const handleSplitCaption = (segmentId: string) => {
    const seg = segments.find((s) => s.id === segmentId);
    const words = seg?.words || [];
    if (!seg || words.length < 2) return;

    let idx = Math.floor(words.length / 2);
    const t = playback.currentTime;
    if (t > seg.start && t < seg.end) {
      const after = words.findIndex((w, i) => i > 0 && (w.start ?? 0) > t);
      idx = Math.min(words.length - 1, Math.max(1, after > 0 ? after : words.length - 1));
    }

    const first = words.slice(0, idx);
    const second = words.slice(idx);
    const taken = new Set(segments.map((s) => s.id));
    let n = 1;
    while (taken.has(`${seg.id}_${n}`) || taken.has(`${seg.id}_${n + 1}`)) n += 2;
    const a: CaptionSegment = {
      ...seg,
      id: `${seg.id}_${n}`,
      text: first.map((w) => w.text).join(' '),
      start: (first[0].start as number) ?? seg.start,
      end: (first[first.length - 1].end as number) ?? seg.end,
      words: first,
    };
    const b: CaptionSegment = {
      ...seg,
      id: `${seg.id}_${n + 1}`,
      text: second.map((w) => w.text).join(' '),
      start: (second[0].start as number) ?? seg.start,
      end: (second[second.length - 1].end as number) ?? seg.end,
      words: second,
    };
    setSegments((prev) => prev.flatMap((s) => (s.id === segmentId ? [a, b] : [s])));
    setSelectedSegmentId(a.id);
  };

  const startPollingExport = useCallback((exportId: string) => {
    if (exportPollingRef.current) {
      clearInterval(exportPollingRef.current);
    }

    let consecutiveFailures = 0;

    exportPollingRef.current = setInterval(async () => {
      try {
        const statusRes = await exportsApi.getStatus(exportId);
        const data = statusRes.data;
        consecutiveFailures = 0;

        setExportProgress(Math.max(15, Math.min(99, data.progress || 50)));
        setExportStepText(data.message || 'Encoding video with FFmpeg...');

        if (data.status === 'completed') {
          if (exportPollingRef.current) clearInterval(exportPollingRef.current);
          setIsExporting(false);
          setExportProgress(100);
          setExportStatus('completed');
          setExportStepText('Export completed successfully!');
          const dlUrl = exportsApi.downloadUrl(exportId, `captioned_${projectName || 'video'}.mp4`);
          setDownloadUrl(dlUrl);
          setCurrentExportId(exportId);
        } else if (data.status === 'failed') {
          if (exportPollingRef.current) clearInterval(exportPollingRef.current);
          setIsExporting(false);
          setExportStatus('failed');
          setExportStepText(data.error || data.message || 'Export failed. Please check server logs.');
        }
      } catch (err: any) {
        consecutiveFailures += 1;
        // Don't kill polling on transient network hiccups
        if (consecutiveFailures > 5) {
          if (exportPollingRef.current) clearInterval(exportPollingRef.current);
          setIsExporting(false);
          setExportStatus('failed');
          setExportStepText('Network connection lost while tracking export progress. Please retry.');
        }
      }
    }, 1500);
  }, [projectName]);

  // Check latest export status when modal is opened
  useEffect(() => {
    if (!showExportModal || isExporting) return;
    let isCancelled = false;

    const checkLatest = async () => {
      try {
        const res = await exportsApi.getLatest(projectId);
        const data = res.data;
        if (isCancelled || !data) return;

        if (data.status === 'completed' && (data.id || data.export_id)) {
          const expId = data.id || data.export_id!;
          setCurrentExportId(expId);
          const dlUrl = exportsApi.downloadUrl(expId, `captioned_${projectName || 'video'}.mp4`);
          setDownloadUrl(dlUrl);
          setExportStatus('completed');
          setExportProgress(100);
          setExportStepText('Your exported video is ready for download.');
        } else if ((data.status === 'processing' || data.status === 'pending') && (data.id || data.export_id)) {
          const expId = data.id || data.export_id!;
          setCurrentExportId(expId);
          setIsExporting(true);
          setExportStatus('processing');
          setExportProgress(data.progress || 15);
          setExportStepText(data.message || 'Processing video export...');
          startPollingExport(expId);
        }
      } catch {
        // Non-critical, user can start fresh export
      }
    };

    if (exportStatus === 'idle' && !downloadUrl) {
      checkLatest();
    }

    return () => {
      isCancelled = true;
    };
  }, [showExportModal, projectId, exportStatus, downloadUrl, isExporting, projectName, startPollingExport]);

  const handleStartExport = async () => {
    if (isExporting) return; // Prevent duplicate export triggers

    if (exportPollingRef.current) {
      clearInterval(exportPollingRef.current);
    }

    setIsExporting(true);
    setExportStatus('processing');
    setExportProgress(10);
    setExportStepText('Preparing video & rendering captions...');
    setDownloadUrl(null);
    setDownloadError(null);

    try {
      // Merge active template styling into segments for export consistency
      const exportSegments = segments.map((seg) => {
        const baseStyle: Record<string, any> = {
          font: activeTemplate.fontFamily || 'Inter',
          fontSize: activeTemplate.fontSize || 48,
          fontWeight: activeTemplate.fontWeight || 700,
          textColor: activeTemplate.textColor || '#FFFFFF',
          strokeColor: activeTemplate.strokeColor || '#000000',
          strokeWidth: activeTemplate.strokeWidth || 0,
          background: (activeTemplate as any).backgroundColor || (activeTemplate as any).background || 'transparent',
          highlightColor: activeTemplate.highlightColor || '#FFD700',
          letterSpacing: activeTemplate.letterSpacing || 0,
          lineHeight: activeTemplate.lineHeight || 1.2,
        };

        return {
          ...seg,
          style_data: {
            ...baseStyle,
            ...(seg.style_data || {}),
          } as any,
          position_data: {
            position: activeTemplate.position || 'bottom-center',
            ...(seg.position_data || {}),
          } as any,
          animation_data: Object.assign(
            { type: activeTemplate.animation || 'none' },
            seg.animation_data || {}
          ) as any,
        };
      });

      await captionsApi.updateAll(projectId, exportSegments);
      const exportSegmentsWithLayer = exportSegments.map((seg) => ({ ...seg, caption_layer: captionLayer })) as any;
      const createRes = await exportsApi.create(projectId, exportResolution, textLayers, exportSegmentsWithLayer, activeTemplate, selectedAspectRatio);
      const exportId = createRes.data?.id;

      if (!exportId) throw new Error('Failed to obtain Export ID from server');

      setCurrentExportId(exportId);
      setExportProgress(15);
      setExportStepText('Queued in FFmpeg rendering pipeline...');
      startPollingExport(exportId);

    } catch (err: any) {
      setIsExporting(false);
      setExportStatus('failed');
      setExportStepText(err?.response?.data?.detail || err.message || 'Export failed to start.');
    }
  };

  const handleDownloadMp4 = async () => {
    if (!downloadUrl && !currentExportId) return;

    setIsDownloading(true);
    setDownloadError(null);

    const targetUrl = downloadUrl || (currentExportId ? exportsApi.downloadUrl(currentExportId) : '');
    const cleanFilename = (projectName || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `captioned_${cleanFilename}.mp4`;

    try {
      // 1. Get access token if authenticated
      let token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        try {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token || null;
        } catch {}
      }

      // 2. Fetch binary MP4 via fetch with CORS
      const headers: Record<string, string> = {
        Accept: 'video/mp4,application/octet-stream,*/*',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      // 3. Convert to Blob with video/mp4 MIME type
      const blob = await response.blob();
      const mp4Blob = new Blob([blob], { type: 'video/mp4' });

      // 4. Create object URL (same-origin to the page, ensuring browser honors download attribute)
      const blobUrl = window.URL.createObjectURL(mp4Blob);

      // 5. Trigger download via programmatic anchor click
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', filename);
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      tempLink.click();

      // Clean up DOM and revoke object URL
      setTimeout(() => {
        if (document.body.contains(tempLink)) {
          document.body.removeChild(tempLink);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      setIsDownloading(false);
    } catch (err: any) {
      console.warn('Programmatic MP4 download error, triggering fallback:', err);
      setIsDownloading(false);
      setDownloadError(err?.message || 'Automatic download failed. Use the direct link below.');

      // Fallback: direct window open / navigation to the download URL
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleResetExport = () => {
    if (exportPollingRef.current) {
      clearInterval(exportPollingRef.current);
    }
    setIsExporting(false);
    setExportStatus('idle');
    setExportProgress(0);
    setExportStepText('');
    setDownloadUrl(null);
    setDownloadError(null);
  };

  const positions: { id: PositionData['position']; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'middle-left', label: 'Mid Left' },
    { id: 'center', label: 'Center' },
    { id: 'middle-right', label: 'Mid Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  const animations: { id: AnimationData['type']; label: string; desc: string }[] = [
    { id: 'none', label: 'None', desc: 'Instant display' },
    { id: 'fade', label: 'Fade In', desc: 'Smooth opacity transition' },
    { id: 'pop', label: 'Pop In', desc: 'Dynamic scale bounce' },
    { id: 'slide-up', label: 'Slide Up', desc: 'Slide up from bottom' },
    { id: 'slide-down', label: 'Slide Down', desc: 'Slide down from top' },
    { id: 'scale', label: 'Scale Up', desc: 'Zoom scale entrance' },
    { id: 'word-by-word', label: 'Word reveal', desc: 'Word-by-word reveal' },
    { id: 'karaoke', label: 'Karaoke', desc: 'Synchronized fill' },
  ];



  const fontCategories = [
    'All',
    'Sans Serif',
    'Bold / Heavy',
    'Serif',
    'Display',
    'Script',
    'Handwritten',
    'Monospace',
    'Condensed',
    'Rounded',
    'Retro',
    'Futuristic',
    'Pixel',
    'Telugu',
    'Hindi',
  ];
  const aspectRatios: AspectRatio[] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9'];

  const filteredTemplates = (templateTier === 'advanced' ? ADVANCED_TEMPLATES : BASIC_TEMPLATES).filter((t) => {
    const matchesCategory = templateCategory === 'All' || t.category === templateCategory;
    const matchesSearch = !templateSearchQuery || t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) || t.category.toLowerCase().includes(templateSearchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(templateSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredFonts = FONT_LIBRARY.filter((f) => {
    const matchesCat = fontCategory === 'All' || f.category === fontCategory;
    const matchesQuery = !fontSearchQuery || f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()) || f.family.toLowerCase().includes(fontSearchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Same order as the Layers panel (front-most first) so rows line up with the list.
  const layerBars: TimelineLayerBar[] = [...textLayers].sort((a, b) => b.zIndex - a.zIndex).map((l) => ({
    id: l.id,
    label: layerDisplayName(l),
    start: l.startTime ?? 0,
    end: l.endTime ?? Math.max(playback.duration, (l.startTime ?? 0) + 1),
    selected: l.id === selectedLayerId,
    locked: !!l.locked,
    visible: l.visible !== false,
    behind: l.layering === 'behind',
  }));

  const langInfo = LANGUAGE_LABELS[initialLanguage] || { name: initialLanguage, flag: '🌐' };

  return (
    <AppShell hideSidebar title="Editor">
      <div className="min-h-[100dvh] lg:min-h-0 lg:h-[calc(100vh-2rem)] flex flex-col -m-4 md:-m-8 bg-[#0B0D10]">

        {/* TOP BAR */}
        <div className="order-none lg:h-14 bg-[#11151A] border-b border-[#262D36] px-3 sm:px-4 py-2 lg:py-0 pt-[max(0.5rem,env(safe-area-inset-top))] lg:pt-0 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 lg:flex-none">
            <Link
              href="/dashboard"
              onClick={(e) => {
                if (hasUnsavedChanges && !window.confirm(saveStatus === 'error' ? 'Your latest changes failed to save. Leave anyway?' : 'Changes are still saving. Leave anyway?')) {
                  e.preventDefault();
                }
              }}
              className="p-2 lg:p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-[#151A21] transition-colors text-xs font-semibold shrink-0 whitespace-nowrap"
            >
              &larr;<span className="hidden sm:inline"> Dashboard</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 border-l border-[#262D36] pl-2 sm:pl-4 min-w-0 flex-wrap">
              {isEditingName ? (
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  autoFocus
                  className="bg-[#151A21] border border-[#262D36] rounded-lg px-2 py-0.5 text-xs text-white font-bold"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingName(true)}
                  className="text-sm font-bold text-white cursor-pointer hover:text-primary-400 flex items-center gap-1.5 min-w-0"
                >
                  <span className="truncate max-w-[40vw] sm:max-w-[240px] lg:max-w-none">{projectName}</span>
                  <svg className="w-3.5 h-3.5 text-brand-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </h2>
              )}

              {/* Target Caption Language Pill */}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center gap-1 whitespace-nowrap">
                <span>{(LANGUAGE_LABELS[currentCaptionMode] || langInfo).flag}</span>
                <span><span className="hidden sm:inline">Caption: </span>{(LANGUAGE_LABELS[currentCaptionMode] || langInfo).name}</span>
              </span>

              {/* Real-time Save Status Indicator */}
              {saveStatus === 'saving' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  ✓ Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                  ⚠️ Save failed
                </span>
              )}
            </div>

            {/* Edit actions: Undo / Redo / Split / Save */}
            <div className="flex items-center gap-0.5 border-l border-[#262D36] pl-2 sm:pl-3 shrink-0" role="toolbar" aria-label="Edit actions">
              <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo" className="p-2 lg:p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-[#151A21] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-brand-muted disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" /></svg>
              </button>
              <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z / Ctrl+Y)" aria-label="Redo" className="p-2 lg:p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-[#151A21] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-brand-muted disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13" /></svg>
              </button>
              <button
                type="button"
                onClick={() => selectedSegment && handleSplitCaption(selectedSegment.id)}
                disabled={!selectedSegment || (selectedSegment.words?.length ?? 0) < 2}
                title="Split selected caption at the playhead (or the middle)"
                aria-label="Split selected caption"
                className="p-2 lg:p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-[#151A21] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-brand-muted disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" /></svg>
              </button>
              <button
                type="button"
                onClick={handleSaveNow}
                disabled={segments.length === 0 || saveStatus === 'saving'}
                title="Save captions now"
                className="ml-1 px-2.5 py-1.5 lg:py-1 rounded-lg text-[11px] font-semibold border border-[#262D36] text-brand-muted hover:text-white hover:border-brand-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saveStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto min-w-0">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1 bg-[#151A21] p-1 rounded-xl border border-[#262D36] min-w-0 flex-1 lg:flex-none overflow-x-auto scrollbar-thin">
              <span className="text-[10px] font-semibold text-brand-subtle px-1.5 whitespace-nowrap hidden sm:inline">Canvas Ratio:</span>
              {aspectRatios.map((ar) => (
                <button
                  key={ar}
                  onClick={() => {
                    setHasUserChangedAspectRatio(true);
                    setSelectedAspectRatio(ar);
                  }}
                  className={`px-2.5 lg:px-2 py-1.5 lg:py-0.5 rounded text-[10px] font-bold transition-all whitespace-nowrap shrink-0 ${
                    selectedAspectRatio === ar
                      ? 'bg-primary-600 text-white'
                      : 'text-brand-muted hover:text-white'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="shadow-lg shadow-primary-600/25 shrink-0 whitespace-nowrap min-h-[36px] lg:min-h-0"
            >
              Export<span className="hidden sm:inline"> Video</span> &rarr;
            </Button>
          </div>
        </div>

        {/* MAIN BODY: Left Sidebar + Center Canvas + Right Panel */}
        <div className="contents lg:flex lg:flex-1 lg:overflow-hidden">

          {/* LEFT SIDEBAR: Icon Navigation Tabs */}
          <div className="order-3 lg:order-none sticky top-0 lg:static z-20 w-full lg:w-16 bg-[#11151A] border-y lg:border-y-0 lg:border-r border-[#262D36] flex flex-row lg:flex-col items-center px-2 lg:px-0 py-2 lg:py-3 gap-1 lg:gap-0 lg:space-y-3 shrink-0 overflow-x-auto lg:overflow-visible scrollbar-thin">
            {[
              { id: 'captions', label: 'Captions', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
              { id: 'templates', label: 'Templates', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
              { id: 'fonts', label: 'Fonts', icon: 'M4 6h16M4 12h8m-8 6h16' },
              { id: 'text', label: 'Text Style', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
              { id: 'highlight', label: 'Highlight', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
              { id: 'animation', label: 'Animation', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
              { id: 'position', label: 'Position', icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' },
              { id: 'layers', label: 'Layers', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTabType)}
                className={`flex flex-col items-center justify-center w-14 lg:w-12 h-12 shrink-0 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 font-bold'
                    : 'text-brand-muted hover:text-white hover:bg-[#151A21]'
                }`}
                title={tab.label}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="text-[9px] font-semibold mt-1 whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* CENTER CANVAS: Video Player Component */}
          <VideoPlayer
            src={playableVideoSrc}
            loadingLabel={videoLoadState === 'loading' ? `Loading video for editing… ${videoLoadProgress}%` : undefined}
            videoRef={videoRef}
            currentTime={playback.currentTime}
            duration={playback.duration}
            isPlaying={playback.isPlaying}
            activeSegment={activeSegment}
            highlightEnabled={highlightEnabled}
            templateConfig={activeTemplate}
            aspectRatio={selectedAspectRatio}
            snapEnabled={snapGuidesEnabled}
            showSafeAreas={showSafeAreasEnabled}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onVideoDimensions={handleVideoDimensions}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            startSeeking={startSeeking}
            endSeeking={endSeeking}
            onUpdatePosition={(pos) => handleUpdatePosition(pos, positionApplyScope === 'all' ? 'all' : 'current')}
            onUpdateWordPosition={handleUpdateWordPosition}
            selectedWordIndex={selectedPositionWordIndex}
            selectedPhraseRange={selectedPositionPhraseRange}
            onSelectWord={(segId, wIdx) => {
              setSelectedSegmentId(segId);
              setSelectedPositionWordIndex(wIdx);
              setSelectedPositionPhraseRange(null);
            }}
            textLayers={textLayers}
            selectedTextLayerId={selectedTextLayerId}
            onSelectTextLayer={handleSelectLayerFromCanvasOrTimeline}
            onUpdateTextLayerPosition={handleUpdateTextLayerPosition}
            captionVisible={captionLayer.visible}
            captionLocked={captionLayer.locked}
            captionZ={stack.captionZ}
            layerZ={stack.layerZ}
            personMaskEnabled={stack.anyBehind}
            onPersonMaskState={setPersonMask}
          />

          {/* RIGHT PANEL: Dynamic Tab Controls */}
          <div className="editor-touch-panel order-4 lg:order-none w-full lg:w-96 bg-[#11151A] lg:border-l border-[#262D36] p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-5 flex flex-col shrink-0 lg:overflow-y-auto min-w-0">

            {/* TAB 1: CAPTIONS PANEL */}
            {activeTab === 'captions' && (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-[#262D36]">
                  <div>
                    <h3 className="text-sm font-bold text-white">Captions</h3>
                    <p className="text-xs text-brand-subtle">Word-level editable segments</p>
                  </div>
                  <Button size="sm" variant="primary" onClick={handleTranscribe} isLoading={isTranscribing}>
                    {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                  </Button>
                </div>

                {/* Caption Output Language / Script System (5 Output Modes) */}
                <div className="space-y-1.5 bg-[#151A21]/60 p-2.5 rounded-xl border border-[#262D36]">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-semibold text-brand-subtle uppercase tracking-wider">
                      Caption Output Language / Script
                    </label>
                    {isChangingMode && (
                      <span className="text-[10px] text-primary-400 font-mono animate-pulse">Updating...</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CAPTION_OUTPUT_MODES.map((mode) => {
                      const isActive = currentCaptionMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          disabled={isChangingMode}
                          onClick={() => handleModeChange(mode.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isActive
                              ? 'bg-primary-600 border-primary-500 text-white shadow-md shadow-primary-600/30 ring-1 ring-primary-400'
                              : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white hover:border-brand-subtle'
                          } ${isChangingMode ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                        >
                          [ {mode.label} ]
                        </button>
                      );
                    })}
                  </div>
                  {modeError && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[11px] text-amber-400 font-medium">
                      ⚠️ {modeError}
                    </div>
                  )}
                </div>

                {transcribeError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-medium leading-relaxed">
                    ⚠️ {transcribeError}
                  </div>
                )}

                {selectedSegment && (
                  <div className="bg-[#151A21] p-3 rounded-xl border border-[#262D36] space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-mono text-brand-muted">
                      <span>{selectedSegment.start.toFixed(2)}s - {selectedSegment.end.toFixed(2)}s</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSplitCaption(selectedSegment.id)}
                          className="text-primary-400 font-semibold hover:underline cursor-pointer"
                        >
                          Split
                        </button>
                        <button
                          onClick={(e) => handleDeleteSegment(selectedSegment.id, e)}
                          className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          title="Delete this caption segment"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={selectedSegment.text}
                      onChange={(e) => handleUpdateSegmentText(e.target.value)}
                      className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
                  {segments.map((seg) => (
                    <div
                      key={seg.id}
                      onClick={() => {
                        setSelectedSegmentId(seg.id);
                        seekTo(seg.start);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer text-xs transition-all relative group ${
                        selectedSegment?.id === seg.id
                          ? 'border-primary-500 bg-primary-500/10 text-white'
                          : 'border-[#262D36] bg-[#151A21] text-brand-muted hover:border-brand-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-brand-subtle mb-1">
                        <span>{seg.start.toFixed(2)}s - {seg.end.toFixed(2)}s</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSegment(seg.id, e)}
                          className="p-1 text-brand-muted hover:text-red-400 transition-colors rounded hover:bg-red-500/10 cursor-pointer opacity-70 group-hover:opacity-100"
                          title="Delete segment"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                      <p className="font-medium text-white line-clamp-2">{seg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: TEMPLATES PANEL WITH LIVE ANIMATED PREVIEWS */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Template Engine ({ALL_TEMPLATES.length} Presets)</h3>
                  <p className="text-xs text-brand-subtle">Live animated previews generated from configuration</p>
                </div>

                {/* Search & Category Filters */}
                <input
                  type="text"
                  placeholder="Filter templates..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  className="w-full bg-[#151A21] border border-[#262D36] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-primary-500"
                />

                <div className="grid grid-cols-2 gap-1 p-1 bg-[#11151A] border border-[#262D36] rounded-xl" role="tablist" aria-label="Template library">
                  {([
                    ['basic', 'Basic', BASIC_TEMPLATES.length],
                    ['advanced', 'Advanced', ADVANCED_TEMPLATES.length],
                  ] as const).map(([id, label, count]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={templateTier === id}
                      onClick={() => {
                        setTemplateTier(id);
                        setTemplateCategory('All');
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        templateTier === id ? 'bg-primary-600 text-white' : 'text-brand-muted hover:text-white'
                      }`}
                    >
                      {label} <span className="opacity-70 font-medium">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {getCategoriesForTier(templateTier).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTemplateCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                        templateCategory === cat
                          ? 'bg-primary-600 text-white'
                          : 'bg-[#151A21] border border-[#262D36] text-brand-muted hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredTemplates.length === 0 && (
                    <p className="text-xs text-brand-subtle text-center py-6">No templates match “{templateSearchQuery}”.</p>
                  )}
                  {filteredTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        activeTemplate?.id === tmpl.id
                          ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                          : 'border-[#262D36] bg-[#151A21] hover:border-brand-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                          {tmpl.category}
                        </span>
                        <span className="text-[10px] text-brand-subtle">{tmpl.tag}</span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                        {tmpl.name}
                        {activeTemplate?.id === tmpl.id && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-primary-300 bg-primary-500/15 border border-primary-500/30 px-1.5 py-0.5 rounded">Selected</span>
                        )}
                      </h4>

                      {/* LIVE ANIMATED PREVIEW CARD */}
                      <div className="my-2">
                        <LiveTemplatePreview template={tmpl} />
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleApplyFullTemplate(tmpl, false)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#11151A] border border-[#262D36] text-brand-muted hover:text-white hover:border-primary-500 transition-all"
                        >
                          Apply Active
                        </button>
                        <button
                          onClick={() => handleApplyFullTemplate(tmpl, true)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-sm"
                        >
                          Apply to All
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: FONTS PANEL */}
            {activeTab === 'fonts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Font Library</h3>
                    <p className="text-xs text-brand-subtle">300 Google &amp; Indic Fonts System</p>
                  </div>
                  <span className="text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                    {filteredFonts.length} / 300
                  </span>
                </div>

                {/* Scope Selection: Exactly TWO options (All Captions / Specific Word) */}
                <div className="space-y-1.5 bg-[#151A21] p-3 border border-[#262D36] rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-semibold text-brand-subtle uppercase tracking-wider">
                      Apply Font To
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultFont = activeTemplate.typography?.fontFamily || activeTemplate.fontFamily || 'Inter';
                        setSegments((prev) =>
                          prev.map((seg) => ({
                            ...seg,
                            style_data: { ...seg.style_data, font: defaultFont },
                            words: (seg.words || []).map((w: any) => {
                              const { fontFamily, font, ...rest } = w;
                              return rest;
                            }),
                          }))
                        );
                        setSelectedWordIndex(null);
                      }}
                      className="text-[10px] font-medium text-primary-400 hover:underline"
                    >
                      Reset to Template Default
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-[#11151A] p-1 rounded-lg border border-[#262D36]">
                    <button
                      type="button"
                      onClick={() => {
                        setFontApplyScope('all');
                        setSelectedWordIndex(null);
                      }}
                      className={`py-1 rounded text-xs font-bold transition-all text-center ${
                        fontApplyScope === 'all'
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'text-brand-muted hover:text-white'
                      }`}
                    >
                      [ All Captions ]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFontApplyScope('word');
                        if (selectedWordIndex === null && selectedSegment?.words?.length) {
                          setSelectedWordIndex(0);
                        }
                      }}
                      className={`py-1 rounded text-xs font-bold transition-all text-center ${
                        fontApplyScope === 'word'
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'text-brand-muted hover:text-white'
                      }`}
                    >
                      [ Specific Word ]
                    </button>
                  </div>
                </div>

                {/* Word-Level Selection Widget (Only active when Scope is Specific Word or word is selected) */}
                {(fontApplyScope === 'word' || selectedWordIndex !== null) && selectedSegment && selectedSegment.words && selectedSegment.words.length > 0 && (
                  <div className="p-3 bg-[#151A21] border border-[#262D36] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-brand-subtle">
                      <span>Select Word in Active Caption:</span>
                      {selectedWordIndex !== null && (
                        <button
                          onClick={() => setSelectedWordIndex(null)}
                          className="text-xs text-primary-400 hover:underline"
                        >
                          Deselect Word
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {selectedSegment.words.map((w, wIdx) => {
                        const isWordSelected = selectedWordIndex === wIdx;
                        const wordFont = (w as any).fontFamily || (w as any).font;
                        return (
                          <button
                            key={wIdx}
                            onClick={() => {
                              setSelectedWordIndex(wIdx);
                              setFontApplyScope('word');
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                              isWordSelected
                                ? 'bg-primary-600 border-primary-500 text-white font-bold ring-1 ring-primary-400'
                                : wordFont
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-[#11151A] border-[#262D36] text-white hover:border-brand-subtle'
                            }`}
                          >
                            <span>{w.text}</span>
                            {wordFont && <span className="ml-1 text-[9px] text-amber-400">({wordFont})</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-brand-muted">
                      {selectedWordIndex !== null
                        ? `Clicking a font below will change the font of word #${selectedWordIndex + 1} "${selectedSegment.words[selectedWordIndex]?.text}".`
                        : 'Click a word above to target it specifically.'}
                    </p>
                  </div>
                )}

                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search 300 fonts (e.g. Inter, Anton, Gidugu, Poppins)..."
                  value={fontSearchQuery}
                  onChange={(e) => setFontSearchQuery(e.target.value)}
                  className="w-full bg-[#151A21] border border-[#262D36] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                />

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                  {fontCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFontCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                        fontCategory === cat
                          ? 'bg-primary-600 text-white'
                          : 'bg-[#151A21] border border-[#262D36] text-brand-muted hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Font List */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredFonts.map((f) => {
                    const isCurrent = selectedSegment?.style_data?.font === f.family;
                    return (
                      <div
                        key={f.id}
                        onMouseEnter={() => loadFontOnDemand(f.family)}
                        onClick={() => {
                          loadFontOnDemand(f.family);
                          if (fontApplyScope === 'word' && selectedWordIndex !== null && selectedSegment) {
                            const updatedWords = (selectedSegment.words || []).map((w, idx) =>
                              idx === selectedWordIndex ? { ...w, fontFamily: f.family } : w
                            );
                            setSegments(
                              segments.map((seg) =>
                                seg.id === selectedSegment.id ? { ...seg, words: updatedWords } : seg
                              )
                            );
                          } else {
                            handleUpdateStyle({ font: f.family }, true);
                          }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                            : 'border-[#262D36] bg-[#151A21] hover:border-brand-subtle'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white" style={{ fontFamily: f.family }}>
                              {f.name}
                            </span>
                            <span className="text-[9px] text-brand-subtle uppercase px-1.5 py-0.5 rounded bg-[#11151A] border border-[#262D36]">
                              {f.category}
                            </span>
                          </div>
                          {f.indicSupport && (
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                              Indic Supported
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] text-center border-t border-[#262D36]/50">
                          <div className="bg-[#11151A] p-1 rounded text-white font-medium" style={{ fontFamily: f.family }}>
                            {f.sampleEn}
                          </div>
                          <div className="bg-[#11151A] p-1 rounded text-primary-400 font-medium" style={{ fontFamily: f.family }}>
                            {f.sampleTe}
                          </div>
                          <div className="bg-[#11151A] p-1 rounded text-amber-400 font-medium" style={{ fontFamily: f.family }}>
                            {f.sampleHi}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: TEXT STYLE PANEL */}
            {activeTab === 'text' && (
              <div className="space-y-6 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 pb-6">
                <div>
                  <h3 className="text-sm font-bold text-white">Text Style Overrides</h3>
                  <p className="text-xs text-brand-subtle">Fine-tune appearance over base template & font</p>
                </div>

                {/* 1. TYPOGRAPHY */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Typography</span>
                    <button
                      type="button"
                      onClick={() => handleResetSection(['fontSize', 'fontWeight', 'italic', 'underline'])}
                      disabled={!isSectionModified(['fontSize', 'fontWeight', 'italic', 'underline'])}
                      title="Reset this section"
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                        isSectionModified(['fontSize', 'fontWeight', 'italic', 'underline'])
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                          : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span>Reset</span>
                      <span>↺</span>
                    </button>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-brand-muted uppercase font-semibold">Font Size</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={8}
                          max={180}
                          value={selectedSegment?.style_data?.fontSize ?? activeTemplate.typography?.fontSize ?? activeTemplate.fontSize ?? 48}
                          onChange={(e) => handleUpdateStyle({ fontSize: Math.max(8, Math.min(180, Number(e.target.value) || 48)) }, true)}
                          className="w-12 bg-[#11151A] border border-[#262D36] rounded px-1 text-right text-xs font-bold text-primary-400 focus:outline-none"
                        />
                        <span className="text-[10px] text-brand-muted">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={180}
                      value={selectedSegment?.style_data?.fontSize ?? activeTemplate.typography?.fontSize ?? activeTemplate.fontSize ?? 48}
                      onChange={(e) => handleUpdateStyle({ fontSize: Number(e.target.value) }, true)}
                      className="w-full accent-primary-500 cursor-pointer"
                    />
                  </div>

                  {/* Font Weight */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-brand-muted uppercase font-semibold">Font Weight</span>
                      <span className="text-primary-400 font-bold">
                        {selectedSegment?.style_data?.fontWeight ?? activeTemplate.typography?.fontWeight ?? activeTemplate.fontWeight ?? 700}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {[300, 400, 500, 600, 700, 800, 900].map((wt) => {
                        const currentWeight = selectedSegment?.style_data?.fontWeight ?? activeTemplate.typography?.fontWeight ?? activeTemplate.fontWeight ?? 700;
                        const isSelected = currentWeight === wt;
                        return (
                          <button
                            key={wt}
                            type="button"
                            onClick={() => handleUpdateStyle({ fontWeight: wt }, true)}
                            className={`py-1 rounded text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-[#11151A] text-brand-muted border border-[#262D36] hover:text-white'
                            }`}
                          >
                            {wt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Italic & Underline */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateStyle({ italic: !(selectedSegment?.style_data?.italic ?? false) }, true)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        (selectedSegment?.style_data?.italic ?? false)
                          ? 'bg-primary-600/20 border-primary-500 text-primary-400 font-bold'
                          : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                      }`}
                    >
                      <span className="italic font-serif">I</span>
                      <span>Italic: {(selectedSegment?.style_data?.italic ?? false) ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStyle({ underline: !(selectedSegment?.style_data?.underline ?? false) }, true)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        (selectedSegment?.style_data?.underline ?? false)
                          ? 'bg-primary-600/20 border-primary-500 text-primary-400 font-bold'
                          : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                      }`}
                    >
                      <span className="underline">U</span>
                      <span>Underline: {(selectedSegment?.style_data?.underline ?? false) ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. COLOR & OPACITY */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Text Color & Opacity</span>
                    <button
                      type="button"
                      onClick={() => handleResetSection(['textColor', 'textOpacity'])}
                      disabled={!isSectionModified(['textColor', 'textOpacity'])}
                      title="Reset this section"
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                        isSectionModified(['textColor', 'textOpacity'])
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                          : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span>Reset</span>
                      <span>↺</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                        Text Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedSegment?.style_data?.textColor || activeTemplate.colors?.primaryTextColor || activeTemplate.textColor || '#FFFFFF'}
                          onChange={(e) => handleUpdateStyle({ textColor: e.target.value }, true)}
                          className="w-8 h-8 rounded-lg bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={selectedSegment?.style_data?.textColor || activeTemplate.colors?.primaryTextColor || activeTemplate.textColor || '#FFFFFF'}
                          onChange={(e) => handleUpdateStyle({ textColor: e.target.value }, true)}
                          className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-brand-muted uppercase font-semibold">Text Opacity</span>
                        <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.textOpacity ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedSegment?.style_data?.textOpacity ?? 100}
                        onChange={(e) => handleUpdateStyle({ textOpacity: Number(e.target.value) }, true)}
                        className="w-full accent-primary-500 cursor-pointer mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. SPACING & FORMATTING */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Spacing & Width</span>
                    <button
                      type="button"
                      onClick={() => handleResetSection(['letterSpacing', 'lineHeight', 'maxWidth', 'maxLines'])}
                      disabled={!isSectionModified(['letterSpacing', 'lineHeight', 'maxWidth', 'maxLines'])}
                      title="Reset this section"
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                        isSectionModified(['letterSpacing', 'lineHeight', 'maxWidth', 'maxLines'])
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                          : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span>Reset</span>
                      <span>↺</span>
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-brand-muted uppercase font-semibold">Letter Spacing</span>
                      <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.letterSpacing ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={-5}
                      max={20}
                      value={selectedSegment?.style_data?.letterSpacing ?? 0}
                      onChange={(e) => handleUpdateStyle({ letterSpacing: Number(e.target.value) }, true)}
                      className="w-full accent-primary-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-brand-muted uppercase font-semibold">Line Height</span>
                      <span className="text-primary-400 font-bold">{(selectedSegment?.style_data?.lineHeight ?? 1.2).toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.0}
                      step={0.1}
                      value={selectedSegment?.style_data?.lineHeight ?? 1.2}
                      onChange={(e) => handleUpdateStyle({ lineHeight: Number(e.target.value) }, true)}
                      className="w-full accent-primary-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-brand-muted uppercase font-semibold">Max Width</span>
                        <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.maxWidth ?? 90}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        value={selectedSegment?.style_data?.maxWidth ?? 90}
                        onChange={(e) => handleUpdateStyle({ maxWidth: Number(e.target.value) }, true)}
                        className="w-full accent-primary-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">Max Lines</span>
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((lines) => {
                          const isSelected = (selectedSegment?.style_data?.maxLines ?? 2) === lines;
                          return (
                            <button
                              key={lines}
                              type="button"
                              onClick={() => handleUpdateStyle({ maxLines: lines }, true)}
                              className={`py-1 rounded text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-[#11151A] border border-[#262D36] text-brand-muted hover:text-white'
                              }`}
                            >
                              {lines}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. ALIGNMENT & CASE */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Alignment & Case</span>
                    <button
                      type="button"
                      onClick={() => handleResetSection(['alignment', 'textCasing'])}
                      disabled={!isSectionModified(['alignment', 'textCasing'])}
                      title="Reset this section"
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                        isSectionModified(['alignment', 'textCasing'])
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                          : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span>Reset</span>
                      <span>↺</span>
                    </button>
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">Text Alignment</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'left', label: 'Left' },
                        { id: 'center', label: 'Center' },
                        { id: 'right', label: 'Right' },
                      ].map((align) => {
                        const currentAlign = selectedSegment?.style_data?.alignment || activeTemplate.typography?.textAlign || 'center';
                        const isSelected = currentAlign === align.id;
                        return (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => handleUpdateStyle({ alignment: align.id as any }, true)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                            }`}
                          >
                            {align.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">Text Case</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'normal', label: 'Normal' },
                        { id: 'uppercase', label: 'UPPER' },
                        { id: 'lowercase', label: 'lower' },
                        { id: 'capitalize', label: 'Title' },
                      ].map((tc) => {
                        const currentCase = selectedSegment?.style_data?.textCasing || 'normal';
                        const isSelected = currentCase === tc.id;
                        return (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => handleUpdateStyle({ textCasing: tc.id as any }, true)}
                            className={`py-1.5 rounded text-[10px] font-bold transition-all border ${
                              isSelected
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                            }`}
                          >
                            {tc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. OUTLINE / STROKE */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="flex items-center justify-between border-b border-[#262D36] pb-1.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Outline / Stroke</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResetSection(['strokeEnabled', 'strokeColor', 'strokeWidth', 'strokeOpacity'])}
                        disabled={!isSectionModified(['strokeEnabled', 'strokeColor', 'strokeWidth', 'strokeOpacity'])}
                        title="Reset this section"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                          isSectionModified(['strokeEnabled', 'strokeColor', 'strokeWidth', 'strokeOpacity'])
                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                            : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                        }`}
                      >
                        <span>Reset</span>
                        <span>↺</span>
                      </button>
                      <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer border-l border-[#262D36] pl-2">
                        <input
                          type="checkbox"
                          checked={selectedSegment?.style_data?.strokeEnabled ?? (!!activeTemplate.stroke)}
                          onChange={(e) => handleUpdateStyle({ strokeEnabled: e.target.checked }, true)}
                          className="w-4 h-4 accent-primary-500 cursor-pointer"
                        />
                        <span className="font-semibold text-white">Enable</span>
                      </label>
                    </div>
                  </div>

                  {(selectedSegment?.style_data?.strokeEnabled ?? (!!activeTemplate.stroke)) && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                            Stroke Color
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedSegment?.style_data?.strokeColor || activeTemplate.stroke?.color || '#000000'}
                              onChange={(e) => handleUpdateStyle({ strokeColor: e.target.value }, true)}
                              className="w-8 h-8 rounded-lg bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={selectedSegment?.style_data?.strokeColor || activeTemplate.stroke?.color || '#000000'}
                              onChange={(e) => handleUpdateStyle({ strokeColor: e.target.value }, true)}
                              className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-1.5 text-xs text-white font-mono uppercase focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase font-semibold">Stroke Width</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.strokeWidth ?? activeTemplate.stroke?.width ?? 2}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={selectedSegment?.style_data?.strokeWidth ?? activeTemplate.stroke?.width ?? 2}
                            onChange={(e) => handleUpdateStyle({ strokeWidth: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-brand-muted uppercase font-semibold">Stroke Opacity</span>
                          <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.strokeOpacity ?? 100}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={selectedSegment?.style_data?.strokeOpacity ?? 100}
                          onChange={(e) => handleUpdateStyle({ strokeOpacity: Number(e.target.value) }, true)}
                          className="w-full accent-primary-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. SHADOW */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="flex items-center justify-between border-b border-[#262D36] pb-1.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Shadow Effect</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResetSection(['shadowEnabled', 'shadowColor', 'shadowOpacity', 'shadowBlur', 'shadowDistance', 'shadowAngle'])}
                        disabled={!isSectionModified(['shadowEnabled', 'shadowColor', 'shadowOpacity', 'shadowBlur', 'shadowDistance', 'shadowAngle'])}
                        title="Reset this section"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                          isSectionModified(['shadowEnabled', 'shadowColor', 'shadowOpacity', 'shadowBlur', 'shadowDistance', 'shadowAngle'])
                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                            : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                        }`}
                      >
                        <span>Reset</span>
                        <span>↺</span>
                      </button>
                      <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer border-l border-[#262D36] pl-2">
                        <input
                          type="checkbox"
                          checked={selectedSegment?.style_data?.shadowEnabled ?? (typeof activeTemplate.shadow === 'boolean' ? activeTemplate.shadow : !!activeTemplate.shadow?.enabled)}
                          onChange={(e) => handleUpdateStyle({ shadowEnabled: e.target.checked }, true)}
                          className="w-4 h-4 accent-primary-500 cursor-pointer"
                        />
                        <span className="font-semibold text-white">Enable</span>
                      </label>
                    </div>
                  </div>

                  {(selectedSegment?.style_data?.shadowEnabled ?? (typeof activeTemplate.shadow === 'boolean' ? activeTemplate.shadow : !!activeTemplate.shadow?.enabled)) && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                            Shadow Color
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedSegment?.style_data?.shadowColor || '#000000'}
                              onChange={(e) => handleUpdateStyle({ shadowColor: e.target.value }, true)}
                              className="w-8 h-8 rounded-lg bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={selectedSegment?.style_data?.shadowColor || '#000000'}
                              onChange={(e) => handleUpdateStyle({ shadowColor: e.target.value }, true)}
                              className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-1.5 text-xs text-white font-mono uppercase focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase font-semibold">Opacity</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.shadowOpacity ?? 75}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={selectedSegment?.style_data?.shadowOpacity ?? 75}
                            onChange={(e) => handleUpdateStyle({ shadowOpacity: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-brand-muted uppercase">Blur</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.shadowBlur ?? 8}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={30}
                            value={selectedSegment?.style_data?.shadowBlur ?? 8}
                            onChange={(e) => handleUpdateStyle({ shadowBlur: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-brand-muted uppercase">Dist</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.shadowDistance ?? 4}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={30}
                            value={selectedSegment?.style_data?.shadowDistance ?? 4}
                            onChange={(e) => handleUpdateStyle({ shadowDistance: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>

                      </div>
                    </div>
                  )}
                </div>

                {/* 7. TEXT CONTAINER / BACKGROUND */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Text Container / Background</span>
                    <button
                      type="button"
                      onClick={() => handleResetSection(['containerType', 'backgroundColor', 'backgroundOpacity', 'paddingX', 'paddingY', 'borderRadius', 'background'])}
                      disabled={!isSectionModified(['containerType', 'backgroundColor', 'backgroundOpacity', 'paddingX', 'paddingY', 'borderRadius', 'background'])}
                      title="Reset this section"
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                        isSectionModified(['containerType', 'backgroundColor', 'backgroundOpacity', 'paddingX', 'paddingY', 'borderRadius', 'background'])
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                          : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span>Reset</span>
                      <span>↺</span>
                    </button>
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold uppercase text-brand-muted mb-1.5">Container Type</span>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'solid', label: 'Solid' },
                        { id: 'rounded', label: 'Round' },
                        { id: 'pill', label: 'Pill' },
                        { id: 'strip', label: 'Strip' },
                      ].map((bgType) => {
                        const currentType = selectedSegment?.style_data?.containerType || (typeof activeTemplate.background === 'object' ? (activeTemplate.background.shape || 'solid') : (activeTemplate.background && activeTemplate.background !== 'transparent' ? 'solid' : 'none'));
                        const isSelected = currentType === bgType.id;
                        return (
                          <button
                            key={bgType.id}
                            type="button"
                            onClick={() => handleUpdateStyle({ containerType: bgType.id as any }, true)}
                            className={`py-1.5 rounded text-[10px] font-bold transition-all border ${
                              isSelected
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                            }`}
                          >
                            {bgType.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(selectedSegment?.style_data?.containerType ?? 'none') !== 'none' && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                            Background Color
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedSegment?.style_data?.backgroundColor || selectedSegment?.style_data?.background || '#000000'}
                              onChange={(e) => handleUpdateStyle({ backgroundColor: e.target.value, background: e.target.value }, true)}
                              className="w-8 h-8 rounded-lg bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={selectedSegment?.style_data?.backgroundColor || selectedSegment?.style_data?.background || '#000000'}
                              onChange={(e) => handleUpdateStyle({ backgroundColor: e.target.value, background: e.target.value }, true)}
                              className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-1.5 text-xs text-white font-mono uppercase focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase font-semibold">Opacity</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.backgroundOpacity ?? 80}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={selectedSegment?.style_data?.backgroundOpacity ?? 80}
                            onChange={(e) => handleUpdateStyle({ backgroundOpacity: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-brand-muted uppercase">Pad X</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.paddingX ?? 16}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            value={selectedSegment?.style_data?.paddingX ?? 16}
                            onChange={(e) => handleUpdateStyle({ paddingX: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-brand-muted uppercase">Pad Y</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.paddingY ?? 8}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            value={selectedSegment?.style_data?.paddingY ?? 8}
                            onChange={(e) => handleUpdateStyle({ paddingY: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-brand-muted uppercase">Radius</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.borderRadius ?? 8}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={selectedSegment?.style_data?.borderRadius ?? 8}
                            onChange={(e) => handleUpdateStyle({ borderRadius: Number(e.target.value) }, true)}
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. TRANSFORM */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Transform (Scale & Rotation)</span>
                    <button
                      type="button"
                      onClick={() => handleResetSection(['scale', 'rotation'])}
                      disabled={!isSectionModified(['scale', 'rotation'])}
                      title="Reset this section"
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                        isSectionModified(['scale', 'rotation'])
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 cursor-pointer'
                          : 'text-brand-muted/40 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span>Reset</span>
                      <span>↺</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-brand-muted uppercase font-semibold">Scale</span>
                        <span className="text-primary-400 font-bold">{selectedSegment?.style_data?.scale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        value={selectedSegment?.style_data?.scale ?? 100}
                        onChange={(e) => handleUpdateStyle({ scale: Number(e.target.value) }, true)}
                        className="w-full accent-primary-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-brand-muted uppercase font-semibold">Rotation</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={-180}
                            max={180}
                            value={selectedSegment?.style_data?.rotation ?? 0}
                            onChange={(e) => handleUpdateStyle({ rotation: Math.max(-180, Math.min(180, Number(e.target.value) || 0)) }, true)}
                            className="w-12 bg-[#11151A] border border-[#262D36] rounded px-1 text-right text-xs font-bold text-primary-400 focus:outline-none"
                          />
                          <span className="text-[10px] text-brand-muted">°</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={selectedSegment?.style_data?.rotation ?? 0}
                        onChange={(e) => handleUpdateStyle({ rotation: Number(e.target.value) }, true)}
                        className="w-full accent-primary-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: HIGHLIGHT PANEL */}
            {activeTab === 'highlight' && (
              <div className="space-y-6 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Highlight Engine</h3>
                    <p className="text-xs text-brand-subtle">Word-level emphasis & style overrides</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetHighlightTarget(selectedHighlightWordIndex ?? undefined)}
                    title="Reset highlight overrides"
                    className="px-2 py-0.5 rounded text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Reset</span>
                    <span>↺</span>
                  </button>
                </div>

                {/* Mode Selector */}
                <div className="space-y-2 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <span className="block text-xs font-bold text-white uppercase tracking-wider">Highlight Mode</span>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'active-word', label: 'Active' },
                      { id: 'keyword', label: 'Keyword' },
                      { id: 'phrase', label: 'Phrase' },
                      { id: 'karaoke', label: 'Karaoke' },
                    ].map((m) => {
                      const currentMode = selectedSegment?.highlight_data?.mode || (highlightEnabled ? 'active-word' : 'none');
                      const isSelected = currentMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setHighlightEnabled(m.id !== 'none');
                            handleUpdateHighlight({ mode: m.id as any }, true);
                          }}
                          className={`py-1.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-primary-600 border-primary-500 text-white shadow-sm'
                              : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shared Voice Script Word & Phrase Selector */}
                <CaptionWordSelector
                  segments={segments}
                  selectedSegmentId={selectedSegmentId}
                  selectedWordIndex={selectedHighlightWordIndex}
                  onSelectWord={(segId, wIdx, w) => {
                    setSelectedSegmentId(segId);
                    setSelectedHighlightWordIndex(wIdx);
                  }}
                  onSelectPhrase={(segId, startIdx, endIdx) => {
                    setSelectedSegmentId(segId);
                    handleSelectPhrase(segId, startIdx, endIdx);
                  }}
                  onClearSelection={() => setSelectedHighlightWordIndex(null)}
                  highlightData={selectedSegment?.highlight_data}
                />

                {/* Highlight Presets */}
                <div className="space-y-2.5 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Highlight Presets</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { name: 'Classic Yellow', color: '#FFD600', scale: 120, shape: 'none' },
                      { name: 'Bold Red', color: '#EF4444', scale: 130, shape: 'solid', weight: 800 },
                      { name: 'Neon', color: '#00FFCC', scale: 125, shape: 'none', glow: true, glowColor: '#00FFCC' },
                      { name: 'Marker', color: '#0F172A', bg: '#FEF08A', shape: 'marker' },
                      { name: 'Pill', color: '#FFFFFF', bg: '#DC2626', shape: 'pill' },
                      { name: 'Glow', color: '#38BDF8', scale: 120, effect: 'glow-pulse', glow: true },
                    ].map((pr) => (
                      <button
                        key={pr.name}
                        type="button"
                        onClick={() => {
                          if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                            handleUpdateWordTarget(
                              selectedHighlightWordIndex,
                              selectedSegment.words[selectedHighlightWordIndex].text,
                              {
                                textColor: pr.color,
                                backgroundColor: pr.bg,
                                containerType: pr.shape as any,
                                scale: pr.scale ?? 100,
                                fontWeight: pr.weight,
                                glowEnabled: pr.glow,
                                glowColor: pr.glowColor || pr.color,
                              },
                              { effect: (pr.effect as any) || 'none' }
                            );
                          }
                          handleUpdateHighlight({
                            color: pr.color,
                            backgroundColor: pr.bg,
                            shape: (pr.shape as any) || 'none',
                            scale: pr.scale ?? 100,
                            effect: (pr.effect as any) || 'none',
                          }, true);
                          handleUpdateStyle({ highlightColor: pr.color }, true);
                        }}
                        className="p-2 rounded-lg bg-[#11151A] border border-[#262D36] hover:border-primary-500 text-left transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: pr.color }} />
                          <span className="text-[11px] font-bold text-white truncate">{pr.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Intensity Pills */}
                  <div className="pt-1">
                    <span className="block text-[10px] font-semibold text-brand-muted uppercase mb-1">Highlight Intensity</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'Subtle', scale: 110, shape: 'none', effect: 'none' },
                        { label: 'Medium', scale: 125, shape: 'none', effect: 'pop' },
                        { label: 'Strong', scale: 135, shape: 'pill', effect: 'pulse' },
                        { label: 'Extreme', scale: 150, shape: 'marker', effect: 'glow-pulse', glow: true },
                      ].map((inst) => (
                        <button
                          key={inst.label}
                          type="button"
                          onClick={() => {
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(
                                selectedHighlightWordIndex,
                                selectedSegment.words[selectedHighlightWordIndex].text,
                                {
                                  scale: inst.scale,
                                  containerType: inst.shape as any,
                                  glowEnabled: inst.glow,
                                },
                                { effect: inst.effect as any }
                              );
                            }
                            handleUpdateHighlight({
                              scale: inst.scale,
                              shape: inst.shape as any,
                              effect: inst.effect as any,
                              intensity: inst.label.toLowerCase() as any,
                            }, true);
                          }}
                          className="py-1.5 rounded text-[10px] font-bold bg-[#11151A] border border-[#262D36] text-brand-muted hover:text-white hover:border-primary-500 transition-all text-center cursor-pointer"
                        >
                          {inst.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Appearance Overrides (Target Scope) */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5 flex justify-between items-center">
                    <span>Appearance Overrides</span>
                    <span className="text-[10px] text-primary-400 font-normal">
                      {selectedHighlightWordIndex !== null
                        ? `Word #${selectedHighlightWordIndex + 1}`
                        : 'Active Highlight Target'}
                    </span>
                  </div>

                  {/* Color & Font Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                        Highlight Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={
                            (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.textColor) ||
                            selectedSegment?.highlight_data?.color ||
                            selectedSegment?.style_data?.highlightColor ||
                            '#FFD600'
                          }
                          onChange={(e) => {
                            const col = e.target.value;
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { textColor: col });
                            } else {
                              handleUpdateHighlight({ color: col }, true);
                              handleUpdateStyle({ highlightColor: col }, true);
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={
                            (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.textColor) ||
                            selectedSegment?.highlight_data?.color ||
                            selectedSegment?.style_data?.highlightColor ||
                            '#FFD600'
                          }
                          onChange={(e) => {
                            const col = e.target.value;
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { textColor: col });
                            } else {
                              handleUpdateHighlight({ color: col }, true);
                              handleUpdateStyle({ highlightColor: col }, true);
                            }
                          }}
                          className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-1.5 text-xs text-white font-mono uppercase focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                        Highlight Font {selectedHighlightWordIndex === null && <span className="ml-1 normal-case font-normal text-brand-subtle">(select a word above)</span>}
                      </label>
                      <select
                        disabled={selectedHighlightWordIndex === null}
                        value={
                          (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.fontFamily) ||
                          selectedSegment?.style_data?.font ||
                          'Inter'
                        }
                        onChange={(e) => {
                          const f = e.target.value;
                          loadFontOnDemand(f);
                          if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                            handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { fontFamily: f });
                          }
                        }}
                        className="w-full bg-[#11151A] border border-[#262D36] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {FONT_LIBRARY.map((f) => (
                          <option key={f.id} value={f.family}>
                            {f.name} ({f.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Weight (per selected word) */}
                  <div className={selectedHighlightWordIndex === null ? 'opacity-40 pointer-events-none' : ''} aria-disabled={selectedHighlightWordIndex === null}>
                    <span className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">Font Weight {selectedHighlightWordIndex === null && <span className="ml-1 normal-case font-normal text-brand-subtle">(select a word above)</span>}</span>
                    <div className="grid grid-cols-7 gap-1">
                      {[300, 400, 500, 600, 700, 800, 900].map((wt) => {
                        const targetWt = selectedHighlightWordIndex !== null
                          ? selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.fontWeight
                          : undefined;
                        const isSelected = targetWt === wt;
                        return (
                          <button
                            key={wt}
                            type="button"
                            onClick={() => {
                              if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                                handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { fontWeight: wt });
                              }
                            }}
                            className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-[#11151A] text-brand-muted border border-[#262D36] hover:text-white'
                            }`}
                          >
                            {wt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scale & Supersize */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-brand-muted uppercase font-semibold">Relative Word Scale</span>
                      <span className="text-primary-400 font-bold">
                        {
                          (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.scale) ||
                          selectedSegment?.highlight_data?.scale ||
                          120
                        }%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={
                        (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.scale) ||
                        selectedSegment?.highlight_data?.scale ||
                        120
                      }
                      onChange={(e) => {
                        const sc = Number(e.target.value);
                        if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                          handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { scale: sc });
                        } else {
                          handleUpdateHighlight({ scale: sc }, true);
                        }
                      }}
                      className="w-full accent-primary-500 cursor-pointer"
                    />
                    <div className="pt-1.5">
                      <span className="block text-[10px] font-semibold uppercase text-brand-muted mb-1">Supersize Quick Presets</span>
                      <div className="grid grid-cols-6 gap-1">
                        {[100, 110, 125, 150, 175, 200].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => {
                              if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                                handleUpdateWordTarget(
                                  selectedHighlightWordIndex,
                                  selectedSegment.words[selectedHighlightWordIndex].text,
                                  { scale: sz },
                                  { supersizePreset: sz }
                                );
                              } else {
                                handleUpdateHighlight({ scale: sz }, true);
                              }
                            }}
                            className="py-1 rounded text-[10px] font-bold bg-[#11151A] border border-[#262D36] text-brand-muted hover:text-white hover:border-primary-500 transition-all text-center cursor-pointer"
                          >
                            {sz}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Container Shape */}
                  <div>
                    <span className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">Container Shape</span>
                    <div className="grid grid-cols-6 gap-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'solid', label: 'Solid' },
                        { id: 'rounded', label: 'Round' },
                        { id: 'pill', label: 'Pill' },
                        { id: 'marker', label: 'Marker' },
                        { id: 'underline', label: 'Line' },
                      ].map((shp) => {
                        const targetShape = selectedHighlightWordIndex !== null
                          ? selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.containerType
                          : selectedSegment?.highlight_data?.shape;
                        const isSelected = targetShape === shp.id;
                        return (
                          <button
                            key={shp.id}
                            type="button"
                            onClick={() => {
                              if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                                handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { containerType: shp.id as any });
                              } else {
                                handleUpdateHighlight({ shape: shp.id as any }, true);
                              }
                            }}
                            className={`py-1.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                            }`}
                          >
                            {shp.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Container Background Color */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-brand-muted mb-1">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={
                          (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.backgroundColor) ||
                          selectedSegment?.highlight_data?.backgroundColor ||
                          '#FEF08A'
                        }
                        onChange={(e) => {
                          const bgCol = e.target.value;
                          if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                            handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { backgroundColor: bgCol });
                          } else {
                            handleUpdateHighlight({ backgroundColor: bgCol }, true);
                          }
                        }}
                        className="w-full h-8 rounded-lg bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Stroke & Outline Overrides (per selected word) */}
                  <div className={`pt-2 border-t border-[#262D36] space-y-2 ${selectedHighlightWordIndex === null ? 'opacity-40 pointer-events-none' : ''}`} aria-disabled={selectedHighlightWordIndex === null}>
                    <div className="flex items-center justify-between text-xs font-semibold text-brand-muted uppercase">
                      <span>Stroke & Outline {selectedHighlightWordIndex === null && <span className="ml-1 normal-case font-normal text-brand-subtle">(select a word above)</span>}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-white font-normal">
                        <input
                          type="checkbox"
                          checked={
                            (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.strokeEnabled) ||
                            false
                          }
                          onChange={(e) => {
                            const en = e.target.checked;
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { strokeEnabled: en, strokeWidth: en ? 2 : 0 });
                            }
                          }}
                          className="accent-primary-500 rounded"
                        />
                        <span>Enable Stroke</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] text-brand-muted mb-1">Stroke Color</span>
                        <input
                          type="color"
                          value={
                            (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.strokeColor) ||
                            '#000000'
                          }
                          onChange={(e) => {
                            const sc = e.target.value;
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { strokeColor: sc, strokeEnabled: true });
                            }
                          }}
                          className="w-full h-7 rounded bg-[#11151A] border border-[#262D36] p-0.5 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-brand-muted mb-1">Width (px)</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={
                            (selectedHighlightWordIndex !== null && selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.styleOverrides?.strokeWidth) ||
                            2
                          }
                          onChange={(e) => {
                            const sw = Number(e.target.value);
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(selectedHighlightWordIndex, selectedSegment.words[selectedHighlightWordIndex].text, { strokeWidth: sw, strokeEnabled: true });
                            }
                          }}
                          className="w-full bg-[#11151A] border border-[#262D36] rounded p-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emphasis Effects */}
                <div className="space-y-2.5 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Emphasis Effect</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'pop', label: 'Pop Bounce' },
                      { id: 'pulse', label: 'Pulse' },
                      { id: 'glow-pulse', label: 'Glow Pulse' },
                      { id: 'shake', label: 'Shake' },
                      { id: 'wobble', label: 'Wobble' },
                      { id: 'scale-in', label: 'Scale In' },
                      { id: 'blur-sharp', label: 'Blur → Sharp' },
                    ].map((eff) => {
                      const targetEff = selectedHighlightWordIndex !== null
                        ? selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.emphasis?.effect
                        : selectedSegment?.highlight_data?.effect;
                      const isSelected = targetEff === eff.id;
                      return (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => {
                            if (selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex]) {
                              handleUpdateWordTarget(
                                selectedHighlightWordIndex,
                                selectedSegment.words[selectedHighlightWordIndex].text,
                                {},
                                { effect: eff.id as any }
                              );
                            } else {
                              handleUpdateHighlight({ effect: eff.id as any }, true);
                            }
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                            isSelected
                              ? 'bg-primary-600 border-primary-500 text-white'
                              : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                          }`}
                        >
                          {eff.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timing & Behavior */}
                <div className="space-y-2.5 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Timing & Behavior</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'while-spoken', label: 'While Spoken' },
                      { id: 'persistent', label: 'Persistent' },
                      { id: 'custom', label: 'Custom' },
                    ].map((tm) => {
                      const targetTm = selectedSegment?.highlight_data?.timingMode || 'while-spoken';
                      const isSelected = targetTm === tm.id;
                      return (
                        <button
                          key={tm.id}
                          type="button"
                          onClick={() => handleUpdateHighlight({ timingMode: tm.id as any }, true)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                            isSelected
                              ? 'bg-primary-600 border-primary-500 text-white'
                              : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                          }`}
                        >
                          {tm.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Timing Inputs */}
                  {selectedSegment?.highlight_data?.timingMode === 'custom' && selectedHighlightWordIndex !== null && selectedSegment?.words?.[selectedHighlightWordIndex] && (
                    <div className="pt-2 border-t border-[#262D36] grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] text-brand-muted mb-1">Start (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={
                            selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.timing?.start ??
                            selectedSegment.words[selectedHighlightWordIndex].start
                          }
                          onChange={(e) => {
                            const st = Number(e.target.value);
                            handleUpdateWordTarget(
                              selectedHighlightWordIndex,
                              selectedSegment.words[selectedHighlightWordIndex].text,
                              {},
                              {},
                              { mode: 'custom', start: st }
                            );
                          }}
                          className="w-full bg-[#11151A] border border-[#262D36] rounded p-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-brand-muted mb-1">End (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={
                            selectedSegment?.highlight_data?.targets?.find((t) => t.wordIndex === selectedHighlightWordIndex)?.timing?.end ??
                            selectedSegment.words[selectedHighlightWordIndex].end
                          }
                          onChange={(e) => {
                            const en = Number(e.target.value);
                            handleUpdateWordTarget(
                              selectedHighlightWordIndex,
                              selectedSegment.words[selectedHighlightWordIndex].text,
                              {},
                              {},
                              { mode: 'custom', end: en }
                            );
                          }}
                          className="w-full bg-[#11151A] border border-[#262D36] rounded p-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 6: ANIMATION PANEL */}
            {activeTab === 'animation' && (
              <div className="space-y-4 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Animation Engine</h3>
                    <p className="text-xs text-brand-subtle">Primary & Advanced motion presets</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetAnimation(true)}
                    title="Reset to template animation default"
                    className="px-2 py-0.5 rounded text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Reset</span>
                    <span>↺</span>
                  </button>
                </div>

                {/* Level Navigation Bar */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-[#151A21] border border-[#262D36] rounded-xl">
                  {[
                    { id: 'primary', label: 'Primary' },
                    { id: 'advanced', label: 'Advanced' },
                    { id: 'controls', label: 'Controls' },
                    { id: 'motion', label: 'Motion' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAnimLevelTab(tab.id as any)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        animLevelTab === tab.id
                          ? 'bg-primary-600 border-primary-500 text-white shadow-sm'
                          : 'bg-[#11151A] border-transparent text-brand-muted hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 1. PRIMARY ANIMATIONS */}
                {animLevelTab === 'primary' && (
                  <div className="space-y-3">
                    {/* Primary Sub-Category Selector */}
                    <div className="grid grid-cols-3 gap-1 bg-[#11151A] p-1 border border-[#262D36] rounded-xl">
                      {[
                        { id: 'entrance', label: 'Entrance / In' },
                        { id: 'word', label: 'Word' },
                        { id: 'exit', label: 'Exit / Out' },
                        { id: 'loop', label: 'Loop' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAnimPrimaryCategory(cat.id as any)}
                          className={`py-1 rounded text-[10px] font-bold transition-all text-center cursor-pointer ${
                            animPrimaryCategory === cat.id
                              ? 'bg-primary-600/30 border border-primary-500 text-white'
                              : 'text-brand-muted hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {(animPrimaryCategory === 'entrance'
                        ? ENTRANCE_PRESETS
                        : animPrimaryCategory === 'word'
                        ? WORD_PRESETS
                        : animPrimaryCategory === 'karaoke'
                        ? PRIMARY_KARAOKE_PRESETS
                        : animPrimaryCategory === 'impact'
                        ? PRIMARY_EMPHASIS_PRESETS
                        : animPrimaryCategory === 'exit'
                        ? PRIMARY_EXIT_PRESETS
                        : PRIMARY_LOOP_PRESETS
                      ).map((preset) => {
                        const currentVal =
                          animPrimaryCategory === 'entrance'
                            ? (selectedSegment?.animation_data?.entrance || selectedSegment?.animation_data?.type || 'none')
                            : animPrimaryCategory === 'word'
                            ? (selectedSegment?.animation_data?.wordAnimation || 'none')
                            : animPrimaryCategory === 'karaoke'
                            ? (selectedSegment?.animation_data?.karaokeAnimation || 'none')
                            : animPrimaryCategory === 'impact'
                            ? (selectedSegment?.animation_data?.emphasisAnimation || 'none')
                            : animPrimaryCategory === 'exit'
                            ? (selectedSegment?.animation_data?.exit || 'none')
                            : (selectedSegment?.animation_data?.loop || 'none');

                        const isSelected = currentVal === (preset.config.entrance || preset.config.wordAnimation || preset.config.karaokeAnimation || preset.config.emphasisAnimation || preset.config.exit || preset.config.loop || preset.id);

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleUpdateAnimation(preset.config, true)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/50'
                                : 'border-[#262D36] bg-[#151A21] hover:border-brand-subtle'
                            }`}
                          >
                            <h4 className="text-xs font-bold text-white truncate">{preset.name}</h4>
                            <p className="text-[10px] text-brand-subtle mt-0.5 line-clamp-2 leading-tight">{preset.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. ADVANCED ANIMATIONS */}
                {animLevelTab === 'advanced' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-1 bg-[#11151A] p-1 border border-[#262D36] rounded-xl">
                      {[
                        { id: 'character', label: 'Character' },
                        { id: 'motion', label: 'Motion' },
                        { id: 'creative', label: 'Creative' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAnimAdvancedCategory(cat.id as any)}
                          className={`py-1 rounded text-[10px] font-bold transition-all text-center cursor-pointer ${
                            animAdvancedCategory === cat.id
                              ? 'bg-primary-600/30 border border-primary-500 text-white'
                              : 'text-brand-muted hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(animAdvancedCategory === 'character'
                        ? CHARACTER_PRESETS
                        : animAdvancedCategory === 'motion'
                        ? MOTION_PRESETS
                        : animAdvancedCategory === 'reveal'
                        ? ADVANCED_REVEAL_PRESETS
                        : CREATIVE_PRESETS
                      ).map((preset) => {
                        const currentVal =
                          animAdvancedCategory === 'character'
                            ? (selectedSegment?.animation_data?.characterAnimation || 'none')
                            : animAdvancedCategory === 'motion'
                            ? (selectedSegment?.animation_data?.advancedMotion || 'none')
                            : animAdvancedCategory === 'reveal'
                            ? (selectedSegment?.animation_data?.advancedReveal || 'none')
                            : (selectedSegment?.animation_data?.creativeEffect || 'none');

                        const isSelected = currentVal === (preset.config.characterAnimation || preset.config.advancedMotion || preset.config.advancedReveal || preset.config.creativeEffect || preset.id);

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleUpdateAnimation(preset.config, true)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/50'
                                : 'border-[#262D36] bg-[#151A21] hover:border-brand-subtle'
                            }`}
                          >
                            <h4 className="text-xs font-bold text-white truncate">{preset.name}</h4>
                            <p className="text-[10px] text-brand-subtle mt-0.5 line-clamp-2 leading-tight">{preset.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. ANIMATION TIMING, EASING & DIRECTION CONTROLS */}
                {animLevelTab === 'controls' && (
                  <div className="space-y-4">
                    {/* Duration & Delay */}
                    <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5">
                        Animation Timing
                      </span>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-brand-muted uppercase font-semibold">Duration</span>
                          <span className="text-primary-400 font-bold">
                            {(selectedSegment?.animation_data?.duration ?? 0.35).toFixed(2)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={2.0}
                          step={0.05}
                          value={selectedSegment?.animation_data?.duration ?? 0.35}
                          onChange={(e) => handleUpdateAnimation({ duration: Number(e.target.value) }, true)}
                          className="w-full accent-primary-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-brand-muted uppercase font-semibold">Start Delay</span>
                          <span className="text-primary-400 font-bold">
                            {(selectedSegment?.animation_data?.delay ?? 0.0).toFixed(2)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.0}
                          max={1.0}
                          step={0.05}
                          value={selectedSegment?.animation_data?.delay ?? 0.0}
                          onChange={(e) => handleUpdateAnimation({ delay: Number(e.target.value) }, true)}
                          className="w-full accent-primary-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-brand-muted uppercase font-semibold">Word / Character Stagger</span>
                          <span className="text-primary-400 font-bold">
                            {(selectedSegment?.animation_data?.stagger ?? 0.05).toFixed(2)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.01}
                          max={0.2}
                          step={0.01}
                          value={selectedSegment?.animation_data?.stagger ?? 0.05}
                          onChange={(e) => handleUpdateAnimation({ stagger: Number(e.target.value) }, true)}
                          className="w-full accent-primary-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Easing Selector */}
                    <div className="space-y-2 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5">
                        Easing Curve
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {[
                          { id: 'linear', label: 'Linear' },
                          { id: 'ease', label: 'Ease' },
                          { id: 'easeIn', label: 'Ease In' },
                          { id: 'easeOut', label: 'Ease Out' },
                          { id: 'easeInOut', label: 'Ease In Out' },
                          { id: 'smooth', label: 'Smooth' },
                          { id: 'spring', label: 'Spring' },
                          { id: 'elastic', label: 'Elastic' },
                          { id: 'bounce', label: 'Bounce' },
                        ].map((es) => {
                          const currentEasing = selectedSegment?.animation_data?.easing || 'easeOut';
                          const isSelected = currentEasing === es.id;
                          return (
                            <button
                              key={es.id}
                              type="button"
                              onClick={() => handleUpdateAnimation({ easing: es.id as any }, true)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-primary-600 border-primary-500 text-white'
                                  : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                              }`}
                            >
                              {es.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Direction Selector */}
                    <div className="space-y-2 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5">
                        Motion Direction
                      </span>
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[
                          { id: 'up', label: 'Up' },
                          { id: 'down', label: 'Down' },
                          { id: 'left', label: 'Left' },
                          { id: 'right', label: 'Right' },
                          { id: 'center', label: 'Center' },
                        ].map((dir) => {
                          const currentDir = selectedSegment?.animation_data?.direction || 'up';
                          const isSelected = currentDir === dir.id;
                          return (
                            <button
                              key={dir.id}
                              type="button"
                              onClick={() => handleUpdateAnimation({ direction: dir.id as any }, true)}
                              className={`py-1.5 rounded text-[10px] font-bold transition-all border text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-primary-600 border-primary-500 text-white'
                                  : 'bg-[#11151A] border-[#262D36] text-brand-muted hover:text-white'
                              }`}
                            >
                              {dir.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. ADVANCED MOTION CONTROL */}
                {animLevelTab === 'motion' && (
                  <div className="space-y-4">
                    {/* Start/End Trajectory Sliders */}
                    <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-xl">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider border-b border-[#262D36] pb-1.5">
                        Motion Parameters
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase">Start Y (px)</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.animation_data?.transform?.startY ?? 35}</span>
                          </div>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            value={selectedSegment?.animation_data?.transform?.startY ?? 35}
                            onChange={(e) =>
                              handleUpdateAnimation({
                                transform: {
                                  ...selectedSegment?.animation_data?.transform,
                                  startY: Number(e.target.value),
                                },
                              }, true)
                            }
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase">Start Scale</span>
                            <span className="text-primary-400 font-bold">{((selectedSegment?.animation_data?.transform?.startScale ?? 0.6) * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={2.0}
                            step={0.05}
                            value={selectedSegment?.animation_data?.transform?.startScale ?? 0.6}
                            onChange={(e) =>
                              handleUpdateAnimation({
                                transform: {
                                  ...selectedSegment?.animation_data?.transform,
                                  startScale: Number(e.target.value),
                                },
                              }, true)
                            }
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase">Start Angle</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.animation_data?.transform?.startRotation ?? 0}°</span>
                          </div>
                          <input
                            type="range"
                            min={-45}
                            max={45}
                            value={selectedSegment?.animation_data?.transform?.startRotation ?? 0}
                            onChange={(e) =>
                              handleUpdateAnimation({
                                transform: {
                                  ...selectedSegment?.animation_data?.transform,
                                  startRotation: Number(e.target.value),
                                },
                              }, true)
                            }
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-brand-muted uppercase">Start Blur</span>
                            <span className="text-primary-400 font-bold">{selectedSegment?.animation_data?.transform?.startBlur ?? 0}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            value={selectedSegment?.animation_data?.transform?.startBlur ?? 0}
                            onChange={(e) =>
                              handleUpdateAnimation({
                                transform: {
                                  ...selectedSegment?.animation_data?.transform,
                                  startBlur: Number(e.target.value),
                                },
                              }, true)
                            }
                            className="w-full accent-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB 7: POSITION PANEL */}
            {activeTab === 'position' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Position Engine</h3>
                    <p className="text-xs text-brand-subtle">Normalized coordinates & direct video drag</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetPosition(positionApplyScope === 'all')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-[#151A21] border border-[#262D36] rounded-lg text-brand-muted hover:text-white hover:border-brand-subtle transition-all cursor-pointer"
                  >
                    Reset Position
                  </button>
                </div>

                {/* Scope Selector */}
                <div className="p-3 bg-[#151A21] border border-[#262D36] rounded-2xl space-y-2">
                  <span className="block text-xs font-bold text-white uppercase tracking-wider">Apply Scope</span>
                  <div className="grid grid-cols-3 gap-1 bg-[#11151A] p-1 border border-[#262D36] rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setPositionApplyScope('current');
                        setSelectedPositionWordIndex(null);
                        setSelectedPositionPhraseRange(null);
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        positionApplyScope === 'current'
                          ? 'bg-primary-600 border border-primary-500 text-white shadow-md'
                          : 'text-brand-muted hover:text-white'
                      }`}
                    >
                      This Caption
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPositionApplyScope('all');
                        setSelectedPositionWordIndex(null);
                        setSelectedPositionPhraseRange(null);
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        positionApplyScope === 'all'
                          ? 'bg-primary-600 border border-primary-500 text-white shadow-md'
                          : 'text-brand-muted hover:text-white'
                      }`}
                    >
                      All Captions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPositionApplyScope('word');
                        if (selectedPositionWordIndex === null && selectedSegment?.words?.length) {
                          setSelectedPositionWordIndex(0);
                        }
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        positionApplyScope === 'word'
                          ? 'bg-primary-600 border border-primary-500 text-white shadow-md'
                          : 'text-brand-muted hover:text-white'
                      }`}
                    >
                      Word / Phrase
                    </button>
                  </div>
                </div>

                {/* Word & Phrase Selection System (reusing CaptionWordSelector) */}
                {positionApplyScope === 'word' && (
                  <div className="space-y-2 p-3 bg-[#151A21] border border-[#262D36] rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">
                        Select Word or Phrase
                      </span>
                      {selectedPositionWordIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedSegment) {
                              handleResetWordPosition(selectedSegment.id, selectedPositionWordIndex);
                            }
                          }}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                        >
                          Reset Word Position
                        </button>
                      )}
                    </div>

                    <CaptionWordSelector
                      segments={segments}
                      selectedSegmentId={selectedSegmentId}
                      selectedWordIndex={selectedPositionWordIndex}
                      onSelectWord={(segId, wIdx) => {
                        setSelectedSegmentId(segId);
                        setSelectedPositionWordIndex(wIdx);
                        setSelectedPositionPhraseRange(null);
                      }}
                      onSelectPhrase={(segId, startIdx, endIdx) => {
                        setSelectedSegmentId(segId);
                        setSelectedPositionWordIndex(startIdx);
                        setSelectedPositionPhraseRange({ startIndex: startIdx, endIndex: endIdx });
                      }}
                      onClearSelection={() => {
                        setSelectedPositionWordIndex(null);
                        setSelectedPositionPhraseRange(null);
                      }}
                    />

                    {selectedSegment && selectedPositionWordIndex !== null && selectedSegment.words?.[selectedPositionWordIndex] && (
                      <div className="p-2 bg-[#11151A] rounded-xl border border-primary-500/30 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-brand-subtle">Targeting: </span>
                          <span className="font-bold text-primary-400 font-mono">
                            {selectedPositionPhraseRange !== null
                              ? `Phrase (${selectedPositionPhraseRange.startIndex + 1}–${selectedPositionPhraseRange.endIndex + 1})`
                              : `Word #${selectedPositionWordIndex + 1} "${selectedSegment.words[selectedPositionWordIndex].text}"`}
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-muted font-mono">
                          {selectedSegment.words[selectedPositionWordIndex].start.toFixed(1)}s–{selectedSegment.words[selectedPositionWordIndex].end.toFixed(1)}s
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3x3 Structured Preset Grid */}
                <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-2xl">
                  <span className="block text-xs font-bold text-white uppercase tracking-wider">Quick Presets</span>

                  {/* TOP ROW */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-brand-subtle uppercase tracking-wider">Top</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {POSITION_PRESETS.filter((p) => p.row === 'top').map((pos) => {
                        const targetWord =
                          positionApplyScope === 'word' && selectedPositionWordIndex !== null && selectedSegment?.words
                            ? selectedSegment.words[selectedPositionWordIndex]
                            : null;
                        const currentPreset = targetWord?.position_data?.preset || targetWord?.position_data?.position || selectedSegment?.position_data?.preset || selectedSegment?.position_data?.position;
                        const isSelected = currentPreset === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => handleUpdatePosition(pos.id, positionApplyScope)}
                            className={`h-10 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center text-center cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500/20 text-white ring-1 ring-primary-500/60 shadow-md'
                                : 'border-[#262D36] bg-[#11151A] text-brand-muted hover:text-white hover:border-brand-subtle'
                            }`}
                          >
                            {pos.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* MIDDLE ROW */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-brand-subtle uppercase tracking-wider">Middle</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {POSITION_PRESETS.filter((p) => p.row === 'middle').map((pos) => {
                        const targetWord =
                          positionApplyScope === 'word' && selectedPositionWordIndex !== null && selectedSegment?.words
                            ? selectedSegment.words[selectedPositionWordIndex]
                            : null;
                        const currentPreset = targetWord?.position_data?.preset || targetWord?.position_data?.position || selectedSegment?.position_data?.preset || selectedSegment?.position_data?.position;
                        const isSelected = currentPreset === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => handleUpdatePosition(pos.id, positionApplyScope)}
                            className={`h-10 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center text-center cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500/20 text-white ring-1 ring-primary-500/60 shadow-md'
                                : 'border-[#262D36] bg-[#11151A] text-brand-muted hover:text-white hover:border-brand-subtle'
                            }`}
                          >
                            {pos.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTTOM ROW */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-brand-subtle uppercase tracking-wider">Bottom</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {POSITION_PRESETS.filter((p) => p.row === 'bottom').map((pos) => {
                        const targetWord =
                          positionApplyScope === 'word' && selectedPositionWordIndex !== null && selectedSegment?.words
                            ? selectedSegment.words[selectedPositionWordIndex]
                            : null;
                        const currentPreset = targetWord?.position_data?.preset || targetWord?.position_data?.position || selectedSegment?.position_data?.preset || selectedSegment?.position_data?.position;
                        const isSelected = currentPreset === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => handleUpdatePosition(pos.id, positionApplyScope)}
                            className={`h-10 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center text-center cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500/20 text-white ring-1 ring-primary-500/60 shadow-md'
                                : 'border-[#262D36] bg-[#11151A] text-brand-muted hover:text-white hover:border-brand-subtle'
                            }`}
                          >
                            {pos.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Precision X / Y Sliders */}
                {(() => {
                  const targetWord =
                    positionApplyScope === 'word' && selectedPositionWordIndex !== null && selectedSegment?.words
                      ? selectedSegment.words[selectedPositionWordIndex]
                      : null;
                  const activePos = targetWord?.position_data || selectedSegment?.position_data || {};
                  const resolved = resolvePosition(activePos, activeTemplate);

                  return (
                    <div className="space-y-3 p-3 bg-[#151A21] border border-[#262D36] rounded-2xl">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">Precision Coordinates</span>

                      {/* Horizontal X Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs text-brand-subtle font-semibold">
                          <span>Horizontal (X)</span>
                          <span className="text-primary-400 font-mono font-bold">
                            {(resolved.x * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.02}
                          max={0.98}
                          step={0.01}
                          value={resolved.x}
                          onChange={(e) =>
                            handleUpdatePosition(
                              {
                                x: parseFloat(e.target.value),
                                y: resolved.y,
                                anchorX: resolved.anchorX,
                                anchorY: resolved.anchorY,
                                custom: true,
                              },
                              positionApplyScope
                            )
                          }
                          className="w-full accent-primary-500 h-1.5 bg-[#1B2129] rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Vertical Y Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs text-brand-subtle font-semibold">
                          <span>Vertical (Y)</span>
                          <span className="text-primary-400 font-mono font-bold">
                            {(resolved.y * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.02}
                          max={0.98}
                          step={0.01}
                          value={resolved.y}
                          onChange={(e) =>
                            handleUpdatePosition(
                              {
                                x: resolved.x,
                                y: parseFloat(e.target.value),
                                anchorX: resolved.anchorX,
                                anchorY: resolved.anchorY,
                                custom: true,
                              },
                              positionApplyScope
                            )
                          }
                          className="w-full accent-primary-500 h-1.5 bg-[#1B2129] rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Anchor Controls */}
                      <div className="pt-2 border-t border-[#262D36] space-y-2">
                        <span className="block text-[11px] font-semibold text-brand-subtle">Anchor Point</span>
                        <div className="grid grid-cols-3 gap-1 bg-[#11151A] p-1 border border-[#262D36] rounded-xl">
                          {(['left', 'center', 'right'] as const).map((ax) => (
                            <button
                              key={ax}
                              type="button"
                              onClick={() =>
                                handleUpdatePosition(
                                  {
                                    x: resolved.x,
                                    y: resolved.y,
                                    anchorX: ax,
                                    anchorY: resolved.anchorY,
                                    custom: true,
                                  },
                                  positionApplyScope
                                )
                              }
                              className={`py-1 rounded text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                resolved.anchorX === ax
                                  ? 'bg-primary-600 border border-primary-500 text-white'
                                  : 'text-brand-muted hover:text-white'
                              }`}
                            >
                              {ax}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Snapping & Platform Safe Zone Controls */}
                <div className="space-y-2 p-3 bg-[#151A21] border border-[#262D36] rounded-2xl">
                  <span className="block text-xs font-bold text-white uppercase tracking-wider">Guides & Safe Areas</span>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-[#11151A] rounded-lg transition-colors">
                      <span className="text-brand-muted font-medium">Intelligent Snapping Guides</span>
                      <input
                        type="checkbox"
                        checked={snapGuidesEnabled}
                        onChange={(e) => setSnapGuidesEnabled(e.target.checked)}
                        className="rounded accent-primary-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-[#11151A] rounded-lg transition-colors">
                      <span className="text-brand-muted font-medium">Safe Zone Overlay (9:16 / Canvas)</span>
                      <input
                        type="checkbox"
                        checked={showSafeAreasEnabled}
                        onChange={(e) => setShowSafeAreasEnabled(e.target.checked)}
                        className="rounded accent-primary-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 8: LAYERS */}
            {activeTab === 'layers' && (
              <LayersPanel
                captionLayer={captionLayer}
                textLayers={textLayers}
                selectedId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onAddText={handleAddTextLayer}
                onDelete={handleDeleteLayer}
                onRename={handleRenameLayer}
                onToggleVisible={handleToggleLayerVisible}
                onToggleLock={handleToggleLayerLock}
                onReorder={handleReorderLayers}
                onUpdateText={handleUpdateTextLayer}
                onSetLayering={handleSetLayering}
                onGoToTab={setActiveTab}
                personMask={personMask}
              />
            )}

          </div>
        </div>

        {/* BOTTOM TIMELINE */}
        <EditorTimeline
          segments={segments}
          selectedSegmentId={selectedSegment?.id ?? null}
          currentTime={playback.currentTime}
          duration={playback.duration}
          isPlaying={playback.isPlaying}
          zoom={timelineZoom}
          onZoomChange={setTimelineZoom}
          scrollRef={timelineScrollRef}
          onSeek={seekTo}
          startSeeking={startSeeking}
          endSeeking={endSeeking}
          onTogglePlay={togglePlay}
          onSelectSegment={setSelectedSegmentId}
          onDeleteSegment={handleDeleteSegment}
          onUpdateTiming={handleUpdateSegmentTiming}
          layerBars={layerBars}
          onSelectLayerBar={handleSelectLayerFromCanvasOrTimeline}
          onUpdateLayerTiming={handleUpdateLayerTiming}
        />

        {/* EXPORT MODAL */}
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title={
            exportStatus === 'completed' || !!downloadUrl
              ? 'Export Completed!'
              : exportStatus === 'processing' || isExporting
              ? 'Exporting Video...'
              : exportStatus === 'failed'
              ? 'Export Failed'
              : 'Export MP4 Video'
          }
          description={
            exportStatus === 'completed' || !!downloadUrl
              ? 'Your video has been rendered and is ready to download.'
              : exportStatus === 'processing' || isExporting
              ? 'Please wait while FFmpeg burns styled captions into your video.'
              : exportStatus === 'failed'
              ? 'An error occurred during video rendering.'
              : 'Render final video with burned-in styled captions using FFmpeg.'
          }
        >
          {exportStatus === 'completed' || !!downloadUrl ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Your MP4 Video is Ready!</h4>
                <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
                  Rendered at <span className="text-white font-semibold">{exportResolution}</span> with burned-in styled captions, fonts, and layout.
                </p>
              </div>

              {downloadError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs text-left">
                  {downloadError}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownloadMp4}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30 font-bold"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Downloading MP4...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download MP4 Video
                    </>
                  )}
                </Button>

                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-brand-muted hover:text-white underline transition-colors py-1"
                  >
                    Direct link fallback (open or save in new tab)
                  </a>
                )}

                <div className="pt-2 border-t border-[#262D36]/60 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={handleResetExport}
                    className="text-brand-muted hover:text-white transition-colors"
                  >
                    &larr; Re-export / Change Settings
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => setShowExportModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : exportStatus === 'failed' ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-rose-300">Export Failed</p>
                  <p className="text-brand-muted break-words">{exportStepText || 'Rendering encountered an unexpected error.'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="md" onClick={() => setShowExportModal(false)}>
                  Close
                </Button>
                <Button variant="primary" size="md" onClick={handleStartExport}>
                  Retry Export
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {stack.anyBehind && (
                <p className="text-xs text-violet-200 bg-violet-500/10 border border-violet-500/25 rounded-xl px-3 py-2" role="note">
                  Behind Character is a preview-only effect. The exported video places those layers in front of the person.
                </p>
              )}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wider">
                  Target Resolution
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['720p', '1080p'] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setExportResolution(res)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        exportResolution === res
                          ? 'border-primary-500 bg-primary-500/10 text-white'
                          : 'border-[#262D36] bg-[#11151A] text-brand-muted'
                      } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {res} ({res === '1080p' ? '1080×1920' : '720×1280'})
                    </button>
                  ))}
                </div>
              </div>

              {isExporting ? (
                <div className="space-y-2 pt-1">
                  <ProgressBar
                    progress={exportProgress}
                    statusText={exportStepText}
                  />
                  <p className="text-[11px] text-brand-muted text-center italic">
                    Rendering on server with FFmpeg. You may close this dialog and return at any time.
                  </p>
                </div>
              ) : (
                <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                  <Button variant="ghost" size="md" onClick={() => setShowExportModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="md" onClick={handleStartExport} disabled={isExporting}>
                    Export Video (.MP4)
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

      </div>
    </AppShell>
  );
}
