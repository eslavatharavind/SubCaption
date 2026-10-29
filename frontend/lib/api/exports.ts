import { apiClient } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const exportsApi = {
  create: (
    projectId: string,
    resolution: string = '1080p',
    textLayers?: any[],
    segments?: any[],
    templateConfig?: any,
    aspectRatio?: string
  ) =>
    apiClient.post<{ id: string; message: string }>(`/projects/${projectId}/export`, {
      project_id: projectId,
      resolution,
      output_format: 'mp4',
      text_layers: textLayers || [],
      segments: segments || [],
      template_config: templateConfig || null,
      aspect_ratio: aspectRatio || '9:16',
    }),
  get: (exportId: string) => apiClient.get(`/exports/${exportId}`),
  getStatus: (exportId: string) => apiClient.get<{ id: string; status: string; progress: number; message: string; error?: string }>(`/exports/${exportId}/status`),
  downloadUrl: (exportId: string) => `${API_BASE_URL}/exports/${exportId}/download`,
  cleanup: (projectId: string) => apiClient.delete(`/projects/${projectId}/cleanup`),
};
