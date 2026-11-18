import apiClient from '@/lib/axios';
import { Board, BoardColumn, PaginatedResponse } from '@/types';

export interface CreateBoardPayload {
  project: number;
  name: string;
  board_type?: 'kanban' | 'scrum';
  is_default?: boolean;
}

export interface CreateColumnPayload {
  board: number;
  name: string;
  color?: string;
  position?: number;
  issue_limit?: number | null;
  maps_to_status: string;
}

export interface UpdateColumnPayload {
  name?: string;
  color?: string;
  position?: number;
  issue_limit?: number | null;
  maps_to_status?: string;
}

export const boardsApi = {
  getBoards: async (projectId?: number): Promise<Board[]> => {
    const params = projectId ? { project: projectId } : undefined;
    const res = await apiClient.get<Board[] | PaginatedResponse<Board>>('/api/boards/', { params });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createBoard: async (data: CreateBoardPayload): Promise<Board> => {
    const res = await apiClient.post<Board>('/api/boards/', data);
    return res.data;
  },

  getBoard: async (boardId: number): Promise<Board> => {
    const res = await apiClient.get<Board>(`/api/boards/${boardId}/`);
    return res.data;
  },

  updateBoard: async (boardId: number, data: Partial<Board>): Promise<Board> => {
    const res = await apiClient.patch<Board>(`/api/boards/${boardId}/`, data);
    return res.data;
  },

  deleteBoard: async (boardId: number): Promise<void> => {
    await apiClient.delete(`/api/boards/${boardId}/`);
  },

  getColumns: async (boardId: number): Promise<BoardColumn[]> => {
    const res = await apiClient.get<BoardColumn[] | PaginatedResponse<BoardColumn>>(
      `/api/boards/${boardId}/columns/`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results || [];
  },

  createColumn: async (boardId: number, data: CreateColumnPayload): Promise<BoardColumn> => {
    const res = await apiClient.post<BoardColumn>(`/api/boards/${boardId}/columns/`, data);
    return res.data;
  },

  updateColumn: async (columnId: number, data: UpdateColumnPayload): Promise<BoardColumn> => {
    const res = await apiClient.patch<BoardColumn>(`/api/columns/${columnId}/`, data);
    return res.data;
  },

  deleteColumn: async (columnId: number): Promise<void> => {
    await apiClient.delete(`/api/columns/${columnId}/`);
  },

  reorderColumns: async (
    boardId: number,
    columnOrder: { id: number; position: number }[]
  ): Promise<BoardColumn[]> => {
    const res = await apiClient.post<BoardColumn[]>(`/api/boards/${boardId}/columns/reorder/`, {
      columns: columnOrder,
    });
    return res.data;
  },
};

export default boardsApi;
