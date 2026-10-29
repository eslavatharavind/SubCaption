import { apiClient } from './client';

export interface UploadResponseData {
  message: string;
  project_id: string;
  filename: string;
  file_size: number;
  duration?: number | null;
}

export const uploadApi = {
  uploadVideo: (
    file: File,
    language?: string,
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (language) {
      formData.append('language', language);
    }
    return apiClient.post<UploadResponseData>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  uploadProjectVideo: (
    projectId: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<UploadResponseData>(`/projects/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  getStatus: (projectId: string) => apiClient.get(`/projects/${projectId}/upload/status`),
};
