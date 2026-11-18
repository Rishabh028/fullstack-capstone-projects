import apiClient from '@/lib/axios';
import { Sprint, PaginatedResponse } from '@/types';

export interface CreateSprintPayload {
  project: number;
  name: string;
  goal?: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateSprintPayload {
  name?: string;
  goal?: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'planning' | 'active' | 'completed';
}

export const sprintsApi = {
  getSprints: async (projectId: number): Promise<Sprint[]> => {
    const res = await apiClient.get<Sprint[] | PaginatedResponse<Sprint>>('/api/sprints/', {
      params: { project: projectId },
    });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createSprint: async (data: CreateSprintPayload): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>('/api/sprints/', data);
    return res.data;
  },

  updateSprint: async (sprintId: number, data: UpdateSprintPayload): Promise<Sprint> => {
    const res = await apiClient.patch<Sprint>(`/api/sprints/${sprintId}/`, data);
    return res.data;
  },

  deleteSprint: async (sprintId: number): Promise<void> => {
    await apiClient.delete(`/api/sprints/${sprintId}/`);
  },

  startSprint: async (
    sprintId: number,
    dates?: { start_date?: string; end_date?: string }
  ): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>(`/api/sprints/${sprintId}/start/`, dates || {});
    return res.data;
  },

  completeSprint: async (sprintId: number): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>(`/api/sprints/${sprintId}/complete/`);
    return res.data;
  },
};

export default sprintsApi;
