import apiClient from '@/lib/axios';
import { Notification, PaginatedResponse } from '@/types';

export const notificationsApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const res = await apiClient.get<Notification[] | PaginatedResponse<Notification>>(
      '/api/notifications/'
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  markAsRead: async (notificationId: number): Promise<Notification> => {
    const res = await apiClient.post<Notification>(
      `/api/notifications/${notificationId}/read/`
    );
    return res.data;
  },

  markAllAsRead: async (): Promise<{ detail: string }> => {
    const res = await apiClient.post<{ detail: string }>('/api/notifications/mark-all-read/');
    return res.data;
  },
};

export default notificationsApi;
