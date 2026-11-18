import apiClient from '@/lib/axios';
import { Subscription } from '@/types';

export const billingApi = {
  getSubscription: async (workspaceSlugOrId: string | number): Promise<Subscription> => {
    const res = await apiClient.get<Subscription>(
      `/api/workspaces/${workspaceSlugOrId}/subscription/`
    );
    return res.data;
  },

  createCheckoutSession: async (
    workspaceSlugOrId: string | number,
    plan: string
  ): Promise<{ checkout_url: string }> => {
    const res = await apiClient.post<{ checkout_url: string }>(
      `/api/workspaces/${workspaceSlugOrId}/billing/checkout/`,
      { plan }
    );
    return res.data;
  },

  createPortalSession: async (
    workspaceSlugOrId: string | number
  ): Promise<{ portal_url: string }> => {
    const res = await apiClient.post<{ portal_url: string }>(
      `/api/workspaces/${workspaceSlugOrId}/billing/portal/`
    );
    return res.data;
  },
};

export default billingApi;
