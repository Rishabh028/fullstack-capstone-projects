export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string;
  created_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  owner: User;
  member_count: number;
  project_count: number;
  created_at: string;
}

export interface WorkspaceMember {
  id: number;
  user: User;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface Project {
  id: number;
  workspace: number;
  name: string;
  key: string;
  description: string;
  lead: User | null;
  status: 'active' | 'archived';
  icon: string;
  color: string;
  created_at: string;
}

export interface BoardColumn {
  id: number;
  board: number;
  name: string;
  color: string;
  position: number;
  issue_limit: number | null;
  maps_to_status: string;
}

export interface Board {
  id: number;
  project: number;
  name: string;
  board_type: 'kanban' | 'scrum';
  is_default: boolean;
  columns: BoardColumn[];
}

export interface Sprint {
  id: number;
  project: number;
  name: string;
  goal: string;
  status: 'planning' | 'active' | 'completed';
  start_date: string | null;
  end_date: string | null;
  issue_count: number;
  completed_count: number;
}

export type IssueType = 'task' | 'bug' | 'story' | 'epic';
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Issue {
  id: number;
  workspace: number;
  project: number;
  board: number | null;
  sprint: number | null;
  sequence_number: number;
  title: string;
  description: string;
  issue_type: IssueType;
  priority: Priority;
  status: IssueStatus;
  assignee: User | null;
  reporter: User;
  parent: number | null;
  order: number;
  story_points: number | null;
  due_date: string | null;
  labels: Label[];
  comment_count: number;
  attachment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  issue: number;
  author: User;
  content: string;
  parent: number | null;
  replies: Comment[];
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface Attachment {
  id: number;
  issue: number;
  uploaded_by: User;
  file: string;
  filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user: User;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  issue: number | null;
  created_at: string;
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: number;
  plan: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
