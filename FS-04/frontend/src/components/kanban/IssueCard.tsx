import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Issue } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { PriorityIcon, IssueTypeIcon } from '@/components/ui/Badge';
import {
  ChatBubbleLeftIcon,
  PaperClipIcon,
  CalendarIcon,
} from '@heroicons/react/20/solid';
import { cn, formatDate } from '@/lib/utils';
import { isPast, parseISO } from 'date-fns';

export interface IssueCardProps {
  issue: Issue;
  onClick?: (issue: Issue) => void;
  isOverlay?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onClick,
  isOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: 'Issue',
      issue,
    },
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const isOverdue =
    issue.due_date &&
    issue.status !== 'done' &&
    issue.status !== 'cancelled' &&
    isPast(parseISO(issue.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick && onClick(issue)}
      className={cn(
        'group relative select-none rounded-xl bg-white p-3.5 shadow-sm border border-gray-200/80 transition-all duration-150',
        'hover:border-indigo-300 hover:shadow-md cursor-grab active:cursor-grabbing',
        isOverlay && 'shadow-2xl ring-2 ring-indigo-500 scale-105 rotate-1 cursor-grabbing z-50'
      )}
    >
      {/* Top row: Type icon, Key/Seq, Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <IssueTypeIcon type={issue.issue_type} className="h-4 w-4" />
          <span className="font-mono text-xs font-semibold text-gray-500">
            #{issue.sequence_number}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <PriorityIcon priority={issue.priority} className="h-4 w-4" />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
        {issue.title}
      </h4>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {issue.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: `${label.color || '#e0e7ff'}20`,
                color: label.color || '#4338ca',
                border: `1px solid ${label.color || '#c7d2fe'}50`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer Info: Story points, due date, comments, attachments, assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {issue.story_points !== null && (
            <span
              className="flex items-center justify-center h-4.5 min-w-[18px] px-1 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600"
              title="Story Points"
            >
              {issue.story_points}
            </span>
          )}

          {issue.due_date && (
            <span
              className={cn(
                'flex items-center space-x-1 text-[11px]',
                isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'
              )}
              title={isOverdue ? 'Overdue!' : 'Due date'}
            >
              <CalendarIcon className="h-3 w-3 shrink-0" />
              <span>{formatDate(issue.due_date, 'MMM d')}</span>
            </span>
          )}

          {issue.comment_count > 0 && (
            <span className="flex items-center space-x-0.5 text-gray-400 text-[11px]">
              <ChatBubbleLeftIcon className="h-3 w-3" />
              <span>{issue.comment_count}</span>
            </span>
          )}

          {issue.attachment_count > 0 && (
            <span className="flex items-center space-x-0.5 text-gray-400 text-[11px]">
              <PaperClipIcon className="h-3 w-3" />
              <span>{issue.attachment_count}</span>
            </span>
          )}
        </div>

        {/* Assignee */}
        <div>
          {issue.assignee ? (
            <Avatar user={issue.assignee} size="xs" />
          ) : (
            <div
              className="h-6 w-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400"
              title="Unassigned"
            >
              +
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueCard;
