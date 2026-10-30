import { apiClient } from './client';

export interface ExportProgressResponse {
  id?: string;
  export_id?: string;
  project_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'none';
  progress: number;
  message: string;
  error?: string;
  resolution?: string;
  download_url?: string | null;
  created_at?: string;
}

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
  getStatus: (exportId: string) => apiClient.get<ExportProgressResponse>(`/exports/${exportId}/status`),
  getLatest: (projectId: string) => apiClient.get<ExportProgressResponse>(`/projects/${projectId}/latest-export`),
  downloadUrl: (exportId: string, filename?: string) => {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    let base = rawBase.trim().replace(/\/+$/, '');
    if (!base.endsWith('/api')) {
      base = `${base}/api`;
    }
    const fnParam = filename ? `?filename=${encodeURIComponent(filename)}` : '';
    return `${base}/exports/${exportId}/download${fnParam}`;
  },
  cleanup: (projectId: string) => apiClient.delete(`/projects/${projectId}/cleanup`),
};
