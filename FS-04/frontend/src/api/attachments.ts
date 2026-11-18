import apiClient from '@/lib/axios';
import { Attachment, PaginatedResponse } from '@/types';

export const attachmentsApi = {
  getAttachments: async (issueId: number): Promise<Attachment[]> => {
    const res = await apiClient.get<Attachment[] | PaginatedResponse<Attachment>>(
      `/api/issues/${issueId}/attachments/`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  uploadAttachment: async (issueId: number, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    formData.append('file_size', file.size.toString());
    formData.append('content_type', file.type || 'application/octet-stream');

    const res = await apiClient.post<Attachment>(
      `/api/issues/${issueId}/attachments/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  deleteAttachment: async (attachmentId: number): Promise<void> => {
    await apiClient.delete(`/api/attachments/${attachmentId}/`);
  },
};

export default attachmentsApi;
