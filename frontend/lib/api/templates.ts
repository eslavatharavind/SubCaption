import { apiClient } from './client';
import { TemplateConfig } from '@/types/template';

export const templatesApi = {
  list: (category?: string) => apiClient.get<{ templates: TemplateConfig[] }>('/templates', { params: { category } }),
  get: (id: string) => apiClient.get<TemplateConfig>(`/templates/${id}`),
  apply: (projectId: string, templateId: string) => apiClient.post(`/projects/${projectId}/apply-template`, { template_id: templateId }),
};
