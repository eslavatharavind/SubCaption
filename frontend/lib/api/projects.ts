import { apiClient } from './client';
import { Project, ProjectCreateRequest } from '@/types/project';

export const projectsApi = {
  create: (data: ProjectCreateRequest) => apiClient.post<Project>('/projects', data),
  list: () => apiClient.get<{ projects: Project[]; total: number }>('/projects'),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
};
