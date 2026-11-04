import apiClient from '@/lib/axios';
import { Issue, IssueStatus, IssueType, Priority, PaginatedResponse } from '@/types';

export interface IssueFilters {
  workspace?: number;
  project?: number;
  board?: number;
  sprint?: number | null;
  status?: IssueStatus;
  priority?: Priority;
  issue_type?: IssueType;
  assignee?: number;
  search?: string;
  labels?: string;
}

export interface CreateIssuePayload {
  workspace: number;
  project: number;
  title: string;
  description?: string;
  issue_type?: IssueType;
  priority?: Priority;
  status?: IssueStatus;
  assignee?: number | null;
  board?: number | null;
  sprint?: number | null;
  parent?: number | null;
  order?: number;
  story_points?: number | null;
  due_date?: string | null;
  label_ids?: number[];
}

export interface UpdateIssuePayload {
  title?: string;
  description?: string;
  issue_type?: IssueType;
  priority?: Priority;
  status?: IssueStatus;
  assignee?: number | null;
  board?: number | null;
  sprint?: number | null;
  parent?: number | null;
  order?: number;
  story_points?: number | null;
  due_date?: string | null;
  label_ids?: number[];
}

export interface MoveIssuePayload {
  status: IssueStatus;
  order?: number;
  column_id?: number;
}

export interface BulkIssueUpdateItem {
  id: number;
  order?: number;
  status?: IssueStatus;
  sprint?: number | null;
  board?: number | null;
}

export const issuesApi = {
  getIssues: async (filters?: IssueFilters): Promise<Issue[]> => {
    const res = await apiClient.get<Issue[] | PaginatedResponse<Issue>>('/api/issues/', {
      params: filters,
    });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createIssue: async (data: CreateIssuePayload): Promise<Issue> => {
    const res = await apiClient.post<Issue>('/api/issues/', data);
    return res.data;
  },

  getIssue: async (issueId: number): Promise<Issue> => {
    const res = await apiClient.get<Issue>(`/api/issues/${issueId}/`);
    return res.data;
  },

  updateIssue: async (issueId: number, data: UpdateIssuePayload): Promise<Issue> => {
    const res = await apiClient.patch<Issue>(`/api/issues/${issueId}/`, data);
    return res.data;
  },

  deleteIssue: async (issueId: number): Promise<void> => {
    await apiClient.delete(`/api/issues/${issueId}/`);
  },

  moveIssue: async (issueId: number, data: MoveIssuePayload): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/api/issues/${issueId}/move/`, data);
    return res.data;
  },

  bulkUpdateIssues: async (updates: BulkIssueUpdateItem[]): Promise<Issue[]> => {
    const res = await apiClient.post<Issue[]>('/api/issues/bulk-update/', { issues: updates });
    return res.data;
  },
};

export default issuesApi;
