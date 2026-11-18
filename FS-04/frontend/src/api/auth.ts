import apiClient from '@/lib/axios';
import { User, AuthTokens } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

export interface UpdateMePayload {
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar?: string | null;
}

export interface ChangePasswordPayload {
  old_password?: string;
  current_password?: string;
  new_password?: string;
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/register/', data);
    return res.data;
  },

  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login/', data);
    return res.data;
  },

  refresh: async (refresh: string): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/api/auth/refresh/', { refresh });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/auth/me/');
    return res.data;
  },

  updateMe: async (data: UpdateMePayload): Promise<User> => {
    const res = await apiClient.patch<User>('/api/auth/me/', data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordPayload): Promise<{ detail: string }> => {
    const res = await apiClient.post<{ detail: string }>('/api/auth/change-password/', data);
    return res.data;
  },
};

export default authApi;
