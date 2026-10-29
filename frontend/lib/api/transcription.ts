import { apiClient } from './client';
import { CaptionSegment } from '@/types/caption';

export interface TranscriptionResponse {
  message: string;
  project_id: string;
  text: string;
  segments: CaptionSegment[];
  spoken_language?: string;
  caption_language?: string;
  language: string;
  video_duration?: number;
}

export const transcriptionApi = {
  transcribe: (projectId: string, language: string) =>
    apiClient.post<TranscriptionResponse>(`/projects/${projectId}/transcribe`, null, { params: { language } }),
};
