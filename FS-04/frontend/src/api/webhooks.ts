import apiClient from '@/lib/axios';
import { Webhook, PaginatedResponse } from '@/types';

export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: string[];
  is_active?: boolean;
}

export interface WebhookDelivery {
  id: number;
  webhook: number;
  event: string;
  response_status_code: number;
  is_success: boolean;
  payload: Record<string, unknown>;
  response_body: string;
  created_at: string;
}

export const webhooksApi = {
  getWebhooks: async (workspaceSlugOrId: string | number): Promise<Webhook[]> => {
    const res = await apiClient.get<Webhook[] | PaginatedResponse<Webhook>>(
      `/api/workspaces/${workspaceSlugOrId}/webhooks/`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createWebhook: async (
    workspaceSlugOrId: string | number,
    data: CreateWebhookPayload
  ): Promise<Webhook> => {
    const res = await apiClient.post<Webhook>(
      `/api/workspaces/${workspaceSlugOrId}/webhooks/`,
      data
    );
    return res.data;
  },

  updateWebhook: async (
    workspaceSlugOrId: string | number,
    webhookId: number,
    data: Partial<CreateWebhookPayload>
  ): Promise<Webhook> => {
    const res = await apiClient.patch<Webhook>(
      `/api/workspaces/${workspaceSlugOrId}/webhooks/${webhookId}/`,
      data
    );
    return res.data;
  },

  deleteWebhook: async (
    workspaceSlugOrId: string | number,
    webhookId: number
  ): Promise<void> => {
    await apiClient.delete(`/api/workspaces/${workspaceSlugOrId}/webhooks/${webhookId}/`);
  },

  getDeliveries: async (
    workspaceSlugOrId: string | number,
    webhookId: number
  ): Promise<WebhookDelivery[]> => {
    const res = await apiClient.get<WebhookDelivery[] | PaginatedResponse<WebhookDelivery>>(
      `/api/workspaces/${workspaceSlugOrId}/webhooks/${webhookId}/deliveries/`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },
};

export default webhooksApi;
