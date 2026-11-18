import apiClient from '@/lib/axios';
import { Workspace, WorkspaceMember, PaginatedResponse } from '@/types';

export interface CreateWorkspacePayload {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
  logo?: string | null;
}

export interface InviteMemberPayload {
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export const workspacesApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await apiClient.get<Workspace[] | PaginatedResponse<Workspace>>('/api/workspaces/');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createWorkspace: async (data: CreateWorkspacePayload): Promise<Workspace> => {
    const res = await apiClient.post<Workspace>('/api/workspaces/', data);
    return res.data;
  },

  getWorkspace: async (slugOrId: string | number): Promise<Workspace> => {
    const res = await apiClient.get<Workspace>(`/api/workspaces/${slugOrId}/`);
    return res.data;
  },

  updateWorkspace: async (slugOrId: string | number, data: UpdateWorkspacePayload): Promise<Workspace> => {
    const res = await apiClient.patch<Workspace>(`/api/workspaces/${slugOrId}/`, data);
    return res.data;
  },

  deleteWorkspace: async (slugOrId: string | number): Promise<void> => {
    await apiClient.delete(`/api/workspaces/${slugOrId}/`);
  },

  getMembers: async (slugOrId: string | number): Promise<WorkspaceMember[]> => {
    const res = await apiClient.get<WorkspaceMember[] | PaginatedResponse<WorkspaceMember>>(
      `/api/workspaces/${slugOrId}/members/`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  updateMember: async (
    slugOrId: string | number,
    memberId: number,
    role: 'owner' | 'admin' | 'member' | 'viewer'
  ): Promise<WorkspaceMember> => {
    const res = await apiClient.patch<WorkspaceMember>(
      `/api/workspaces/${slugOrId}/members/${memberId}/`,
      { role }
    );
    return res.data;
  },

  removeMember: async (slugOrId: string | number, memberId: number): Promise<void> => {
    await apiClient.delete(`/api/workspaces/${slugOrId}/members/${memberId}/`);
  },

  inviteMember: async (slugOrId: string | number, data: InviteMemberPayload): Promise<{ detail: string }> => {
    const res = await apiClient.post<{ detail: string }>(
      `/api/workspaces/${slugOrId}/invitations/`,
      data
    );
    return res.data;
  },

  acceptInvitation: async (token: string): Promise<{ detail: string }> => {
    const res = await apiClient.post<{ detail: string }>(
      `/api/workspaces/invitations/accept/`,
      { token }
    );
    return res.data;
  },
};

export default workspacesApi;
