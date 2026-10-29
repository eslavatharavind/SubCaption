import { apiClient } from './client';
import { CaptionSegment } from '@/types/caption';

export const captionsApi = {
  list: (projectId: string) => apiClient.get<{ segments: CaptionSegment[]; total: number }>(`/projects/${projectId}/captions`),
  updateAll: (projectId: string, segments: CaptionSegment[]) => apiClient.put(`/projects/${projectId}/captions`, segments),
  update: (captionId: string, data: Partial<CaptionSegment>) => apiClient.patch<CaptionSegment>(`/captions/${captionId}`, data),
  split: (projectId: string, segmentId: string) => apiClient.post<{ message: string; segments: CaptionSegment[] }>(`/projects/${projectId}/captions/split`, { segment_id: segmentId }),
  merge: (projectId: string, segmentIds: string[]) => apiClient.post<{ message: string; segments: CaptionSegment[] }>(`/projects/${projectId}/captions/merge`, { segment_ids: segmentIds }),
  delete: (projectId: string, captionId: string) => apiClient.delete<{ message: string; segments: CaptionSegment[] }>(`/projects/${projectId}/captions/${captionId}`),
  changeMode: (projectId: string, mode: string) => apiClient.post<{ message: string; mode: string; segments: CaptionSegment[] }>(`/projects/${projectId}/captions/mode`, { mode }),
};
