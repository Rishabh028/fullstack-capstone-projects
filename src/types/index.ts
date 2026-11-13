export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type DocumentType = 'DOCUMENT' | 'CANVAS';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  color: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  role?: Role;
  ownerId: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  icon?: string | null;
  type: DocumentType;
  workspaceId: string;
  parentId?: string | null;
  updatedAt: string | Date;
  createdById: string;
  isArchived: boolean;
  children?: DocumentItem[];
}

export interface CommentItem {
  id: string;
  documentId: string;
  userId: string;
  user: UserSummary;
  content: string;
  selectionRange?: string | null;
  resolved: boolean;
  parentId?: string | null;
  replies?: CommentItem[];
  createdAt: string | Date;
}

export interface SnapshotItem {
  id: string;
  documentId: string;
  title: string;
  yjsState: string;
  previewText?: string | null;
  createdById?: string | null;
  createdBy?: UserSummary | null;
  createdAt: string | Date;
}

export interface CanvasElement {
  id: string;
  type: 'rectangle' | 'circle' | 'sticky' | 'arrow' | 'text' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  text?: string;
  points?: { x: number; y: number }[];
  zIndex?: number;
}

export interface CursorState {
  user: {
    name: string;
    color: string;
    avatar?: string;
  };
  cursor?: {
    x: number;
    y: number;
  } | null;
}
