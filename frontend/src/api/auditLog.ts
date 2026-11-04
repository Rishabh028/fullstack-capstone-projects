import apiClient from '@/lib/axios';
import { AuditLog, PaginatedResponse } from '@/types';

export interface AuditLogFilters {
  user?: number;
  action?: string;
  field_name?: string;
  limit?: number;
  offset?: number;
}

export const auditLogApi = {
  getAuditLog: async (
    workspaceSlugOrId: string | number,
    filters?: AuditLogFilters
  ): Promise<PaginatedResponse<AuditLog>> => {
    const res = await apiClient.get<PaginatedResponse<AuditLog> | AuditLog[]>(
      `/api/workspaces/${workspaceSlugOrId}/audit-logs/`,
      { params: filters }
    );
    if (Array.isArray(res.data)) {
      return {
        count: res.data.length,
        next: null,
        previous: null,
        results: res.data,
      };
    }
    return res.data;
  },
};

export default auditLogApi;
