import apiClient from '@/lib/axios';
import { Comment, PaginatedResponse } from '@/types';

export const commentsApi = {
  getComments: async (issueId: number): Promise<Comment[]> => {
    const res = await apiClient.get<Comment[] | PaginatedResponse<Comment>>(
      `/api/issues/${issueId}/comments/`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createComment: async (issueId: number, content: string, parent: number | null = null): Promise<Comment> => {
    const res = await apiClient.post<Comment>(`/api/issues/${issueId}/comments/`, {
      content,
      parent,
    });
    return res.data;
  },

  updateComment: async (commentId: number, content: string): Promise<Comment> => {
    const res = await apiClient.patch<Comment>(`/api/comments/${commentId}/`, {
      content,
    });
    return res.data;
  },

  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/api/comments/${commentId}/`);
  },
};

export default commentsApi;
