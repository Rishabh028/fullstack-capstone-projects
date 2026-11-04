import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Board, BoardColumn, Issue, IssueStatus, Priority, User } from '@/types';
import KanbanColumn from './KanbanColumn';
import IssueCard from './IssueCard';
import issuesApi from '@/api/issues';
import toast from 'react-hot-toast';
import {
  FunnelIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface KanbanBoardProps {
  board: Board;
  issues: Issue[];
  members?: User[];
  onIssueClick: (issue: Issue) => void;
  onRefresh?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  issues: initialIssues,
  members = [],
  onIssueClick,
  onRefresh,
}) => {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  // Filters state
  const [searchFilter, setSearchFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<number | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);

  // Sensors with distance activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchKey = `#${issue.sequence_number}`.includes(q);
      if (!matchTitle && !matchKey) return false;
    }
    if (assigneeFilter !== 'all') {
      if (issue.assignee?.id !== assigneeFilter) return false;
    }
    if (priorityFilter !== 'all') {
      if (issue.priority !== priorityFilter) return false;
    }
    return true;
  });

  // Group issues by column (status mapping)
  const columns = board.columns && board.columns.length > 0
    ? [...board.columns].sort((a, b) => a.position - b.position)
    : [
        { id: 1, board: board.id, name: 'To Do', color: '#3b82f6', position: 1, issue_limit: null, maps_to_status: 'todo' },
        { id: 2, board: board.id, name: 'In Progress', color: '#f59e0b', position: 2, issue_limit: 5, maps_to_status: 'in_progress' },
        { id: 3, board: board.id, name: 'In Review', color: '#8b5cf6', position: 3, issue_limit: null, maps_to_status: 'in_review' },
        { id: 4, board: board.id, name: 'Done', color: '#10b981', position: 4, issue_limit: null, maps_to_status: 'done' },
      ];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const issue = issues.find((i) => i.id === active.id);
    if (issue) {
      setActiveIssue(issue);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Check if dragging over a column container or another card
    const activeIssueItem = issues.find((i) => i.id === activeId);
    if (!activeIssueItem) return;

    let targetStatus: IssueStatus | null = null;

    if (typeof overId === 'string' && overId.startsWith('column-')) {
      const colId = Number(overId.replace('column-', ''));
      const targetCol = columns.find((c) => c.id === colId);
      if (targetCol) {
        targetStatus = targetCol.maps_to_status as IssueStatus;
      }
    } else {
      const overIssueItem = issues.find((i) => i.id === overId);
      if (overIssueItem) {
        targetStatus = overIssueItem.status;
      }
    }

    if (targetStatus && activeIssueItem.status !== targetStatus) {
      setIssues((prev) =>
        prev.map((i) => (i.id === activeId ? { ...i, status: targetStatus! } : i))
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    const originalActiveIssue = initialIssues.find((i) => i.id === activeId);
    if (!originalActiveIssue) return;

    let targetColumn: BoardColumn | undefined;
    let targetStatus: IssueStatus = originalActiveIssue.status;

    if (typeof overId === 'string' && overId.startsWith('column-')) {
      const colId = Number(overId.replace('column-', ''));
      targetColumn = columns.find((c) => c.id === colId);
      if (targetColumn) {
        targetStatus = targetColumn.maps_to_status as IssueStatus;
      }
    } else {
      const overIssueItem = issues.find((i) => i.id === overId);
      if (overIssueItem) {
        targetStatus = overIssueItem.status;
        targetColumn = columns.find((c) => c.maps_to_status === targetStatus);
      }
    }

    // Reorder within the same status column or moved to new column
    const previousIssues = [...issues];

    if (targetStatus !== originalActiveIssue.status) {
      // Optimistic move
      const updatedIssues = issues.map((i) =>
        i.id === activeId ? { ...i, status: targetStatus } : i
      );
      setIssues(updatedIssues);

      try {
        await issuesApi.moveIssue(activeId, {
          status: targetStatus,
          column_id: targetColumn?.id,
        });
        toast.success(`Moved to ${targetColumn?.name || targetStatus}`);
        if (onRefresh) onRefresh();
      } catch (err) {
        setIssues(previousIssues);
        toast.error('Failed to move issue');
      }
    } else if (activeId !== overId) {
      // Reordering in the same column
      const columnIssues = issues.filter((i) => i.status === targetStatus);
      const oldIndex = columnIssues.findIndex((i) => i.id === activeId);
      const newIndex = columnIssues.findIndex((i) => i.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columnIssues, oldIndex, newIndex);
        const reorderedWithOrder = reordered.map((item, index) => ({
          ...item,
          order: index,
        }));

        const newFullList = issues.map((i) => {
          const match = reorderedWithOrder.find((r) => r.id === i.id);
          return match || i;
        });

        setIssues(newFullList);

        try {
          await issuesApi.bulkUpdateIssues(
            reorderedWithOrder.map((item) => ({
              id: item.id,
              order: item.order,
              status: item.status,
            }))
          );
        } catch (err) {
          setIssues(previousIssues);
          toast.error('Failed to reorder issues');
        }
      }
    }
  };

  const handleInlineAdd = async (column: BoardColumn, title: string) => {
    try {
      const newIssue = await issuesApi.createIssue({
        workspace: board.project ? 1 : 1, // backend determines workspace from project or auth
        project: board.project,
        board: board.id,
        title,
        status: column.maps_to_status as IssueStatus,
        priority: 'medium',
        issue_type: 'task',
      });
      setIssues((prev) => [newIssue, ...prev]);
      toast.success(`Issue added to ${column.name}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add issue');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Board Controls & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-bold text-gray-900">{board.name}</h2>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 capitalize">
            {board.board_type}
          </span>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter issues..."
              className="rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) =>
              setAssigneeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="highest">Highest</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="lowest">Lowest</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'board' ? 'bg-white shadow-xs text-indigo-600' : 'text-gray-500 hover:text-gray-900'
              )}
              title="Board View"
            >
              <ViewColumnsIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-white shadow-xs text-indigo-600' : 'text-gray-500 hover:text-gray-900'
              )}
              title="List View"
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Board Columns (DndContext) */}
      {viewMode === 'board' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex space-x-4 overflow-x-auto pb-4 items-start">
            {columns.map((column) => {
              const columnIssues = filteredIssues.filter(
                (i) => i.status === column.maps_to_status
              );
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  issues={columnIssues}
                  onIssueClick={onIssueClick}
                  onAddIssue={handleInlineAdd}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeIssue ? <IssueCard issue={activeIssue} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View alternative */
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => onIssueClick(issue)}
              className="flex items-center justify-between p-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="font-mono text-xs font-semibold text-gray-500">
                  #{issue.sequence_number}
                </span>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {issue.title}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {issue.status}
                </span>
                <span className="capitalize font-medium text-gray-600">
                  {issue.priority}
                </span>
              </div>
            </div>
          ))}
          {filteredIssues.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No issues match current filters
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
