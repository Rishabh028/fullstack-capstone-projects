import apiClient from '@/lib/axios';
import { Project, PaginatedResponse } from '@/types';

export interface CreateProjectPayload {
  workspace: number;
  name: string;
  key: string;
  description?: string;
  lead?: number | null;
  icon?: string;
  color?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  key?: string;
  description?: string;
  lead?: number | null;
  status?: 'active' | 'archived';
  icon?: string;
  color?: string;
}

export const projectsApi = {
  getProjects: async (workspaceIdOrSlug?: number | string): Promise<Project[]> => {
    const params = workspaceIdOrSlug
      ? typeof workspaceIdOrSlug === 'number'
        ? { workspace: workspaceIdOrSlug }
        : { workspace_slug: workspaceIdOrSlug }
      : undefined;

    const res = await apiClient.get<Project[] | PaginatedResponse<Project>>('/api/projects/', {
      params,
    });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createProject: async (data: CreateProjectPayload): Promise<Project> => {
    const res = await apiClient.post<Project>('/api/projects/', data);
    return res.data;
  },

  getProject: async (idOrKey: number | string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/api/projects/${idOrKey}/`);
    return res.data;
  },

  updateProject: async (idOrKey: number | string, data: UpdateProjectPayload): Promise<Project> => {
    const res = await apiClient.patch<Project>(`/api/projects/${idOrKey}/`, data);
    return res.data;
  },

  deleteProject: async (idOrKey: number | string): Promise<void> => {
    await apiClient.delete(`/api/projects/${idOrKey}/`);
  },
};

export default projectsApi;
