import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardColumn, Issue, IssueStatus } from '@/types';
import IssueCard from './IssueCard';
import AddIssueInline from './AddIssueInline';
import { cn } from '@/lib/utils';
import { EllipsisHorizontalIcon } from '@heroicons/react/20/solid';

export interface KanbanColumnProps {
  column: BoardColumn;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onAddIssue: (column: BoardColumn, title: string) => Promise<void> | void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  issues,
  onIssueClick,
  onAddIssue,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'Column',
      column,
    },
  });

  const issueIds = issues.map((i) => i.id);
  const count = issues.length;
  const isOverLimit = column.issue_limit !== null && count > column.issue_limit;

  return (
    <div className="flex flex-col w-80 shrink-0 select-none rounded-2xl bg-gray-100/80 p-3 max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center space-x-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color || '#6366f1' }}
          />
          <h3 className="text-sm font-bold text-gray-800">{column.name}</h3>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              isOverLimit
                ? 'bg-red-100 text-red-700 font-bold'
                : 'bg-gray-200/80 text-gray-600'
            )}
          >
            {count}
            {column.issue_limit !== null && ` / ${column.issue_limit}`}
          </span>
        </div>

        {isOverLimit && (
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
            WIP Exceeded
          </span>
        )}
      </div>

      {/* Issues Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto space-y-2.5 min-h-[150px] p-1 rounded-xl transition-colors duration-150',
          isOver ? 'bg-indigo-50/70 ring-2 ring-indigo-300 ring-dashed' : ''
        )}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={onIssueClick}
            />
          ))}
        </SortableContext>

        {issues.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400">
            Drop issues here
          </div>
        )}
      </div>

      {/* Column Footer: Inline Add */}
      <div className="pt-2 px-1">
        <AddIssueInline
          onAdd={(title) => onAddIssue(column, title)}
          placeholder={`Add to ${column.name}...`}
        />
      </div>
    </div>
  );
};

export default KanbanColumn;
