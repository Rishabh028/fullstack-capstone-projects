import React from 'react';
import { cn } from '@/lib/utils';
import { IssueStatus, IssueType, Priority } from '@/types';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChevronDoubleUpIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronDoubleDownIcon,
  MinusIcon,
  BookmarkSquareIcon,
  BugAntIcon,
  CheckBadgeIcon,
  FireIcon,
} from '@heroicons/react/20/solid';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  status?: IssueStatus;
  priority?: Priority;
  issueType?: IssueType;
  size?: 'sm' | 'md';
  dot?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusClasses: Record<IssueStatus, string> = {
  backlog: 'bg-slate-100 text-slate-700 border-slate-200',
  todo: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-purple-50 text-purple-700 border-purple-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const priorityClasses: Record<Priority, string> = {
  highest: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lowest: 'bg-slate-100 text-slate-600 border-slate-200',
};

const typeClasses: Record<IssueType, string> = {
  task: 'bg-blue-50 text-blue-700 border-blue-200',
  bug: 'bg-red-50 text-red-700 border-red-200',
  story: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  epic: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const PriorityIcon: React.FC<{ priority: Priority; className?: string }> = ({
  priority,
  className = 'h-3.5 w-3.5',
}) => {
  switch (priority) {
    case 'highest':
      return <ChevronDoubleUpIcon className={cn('text-red-600', className)} />;
    case 'high':
      return <ChevronUpIcon className={cn('text-orange-500', className)} />;
    case 'medium':
      return <MinusIcon className={cn('text-amber-500', className)} />;
    case 'low':
      return <ChevronDownIcon className={cn('text-emerald-500', className)} />;
    case 'lowest':
      return <ChevronDoubleDownIcon className={cn('text-slate-400', className)} />;
    default:
      return null;
  }
};

export const IssueTypeIcon: React.FC<{ type: IssueType; className?: string }> = ({
  type,
  className = 'h-3.5 w-3.5',
}) => {
  switch (type) {
    case 'task':
      return <CheckCircleIcon className={cn('text-blue-500', className)} />;
    case 'bug':
      return <BugAntIcon className={cn('text-red-500', className)} />;
    case 'story':
      return <BookmarkSquareIcon className={cn('text-emerald-500', className)} />;
    case 'epic':
      return <FireIcon className={cn('text-purple-500', className)} />;
    default:
      return null;
  }
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  status,
  priority,
  issueType,
  size = 'md',
  dot = false,
  onRemove,
  className,
}) => {
  let badgeStyle = variantClasses[variant];

  if (status) {
    badgeStyle = statusClasses[status] || variantClasses.default;
  } else if (priority) {
    badgeStyle = priorityClasses[priority] || variantClasses.default;
  } else if (issueType) {
    badgeStyle = typeClasses[issueType] || variantClasses.default;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-md transition-colors',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        badgeStyle,
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5 opacity-80" />}
      {priority && <PriorityIcon priority={priority} className="mr-1 h-3.5 w-3.5" />}
      {issueType && <IssueTypeIcon type={issueType} className="mr-1 h-3.5 w-3.5" />}
      <span>{children || status || priority || issueType}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none"
        >
          ×
        </button>
      )}
    </span>
  );
};

export default Badge;
