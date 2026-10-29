import { useState, useCallback } from 'react';
import { captionsApi } from '@/lib/api/captions';
import { transcriptionApi } from '@/lib/api/transcription';
import { CaptionSegment } from '@/types/caption';

export function useCaptions(projectId: string) {
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCaptions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await captionsApi.list(projectId);
      if (res.data?.segments) {
        setSegments(res.data.segments);
        if (res.data.segments.length > 0 && !selectedSegmentId) {
          setSelectedSegmentId(res.data.segments[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch captions');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSegmentId]);

  const transcribe = async (language: string) => {
    if (!projectId) return;
    setTranscribing(true);
    setError(null);
    try {
      const res = await transcriptionApi.transcribe(projectId, language);
      if (res.data?.segments) {
        setSegments(res.data.segments);
        if (res.data.segments.length > 0) {
          setSelectedSegmentId(res.data.segments[0].id);
        }
      }
      return res.data;
    } catch (err: any) {
      setError(err.message || 'Transcription failed');
      return null;
    } finally {
      setTranscribing(false);
    }
  };

  const updateSegmentText = (segmentId: string, newText: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === segmentId ? { ...seg, text: newText } : seg))
    );
  };

  const updateGlobalStyle = (styleUpdate: Partial<CaptionSegment['style_data']>) => {
    setSegments((prev) =>
      prev.map((seg) => ({
        ...seg,
        style_data: { ...seg.style_data, ...styleUpdate },
      }))
    );
  };

  const updateGlobalPosition = (position: CaptionSegment['position_data']['position']) => {
    setSegments((prev) =>
      prev.map((seg) => ({
        ...seg,
        position_data: { ...seg.position_data, position },
      }))
    );
  };

  const updateGlobalAnimation = (type: CaptionSegment['animation_data']['type']) => {
    setSegments((prev) =>
      prev.map((seg) => ({
        ...seg,
        animation_data: { ...seg.animation_data, type },
      }))
    );
  };

  return {
    segments,
    setSegments,
    selectedSegmentId,
    setSelectedSegmentId,
    loading,
    transcribing,
    error,
    fetchCaptions,
    transcribe,
    updateSegmentText,
    updateGlobalStyle,
    updateGlobalPosition,
    updateGlobalAnimation,
  };
}
