import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PlayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Sprint, Issue, Project, IssueStatus, Priority, IssueType } from '@/types';
import sprintsApi, { CreateSprintPayload } from '@/api/sprints';
import issuesApi from '@/api/issues';
import Avatar from '@/components/ui/Avatar';
import { PriorityIcon, IssueTypeIcon } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface BacklogViewProps {
  project: Project;
  onIssueClick: (issue: Issue) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({ project, onIssueClick }) => {
  const queryClient = useQueryClient();
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');

  const [activeSprintToComplete, setActiveSprintToComplete] = useState<Sprint | null>(null);
  const [collapsedSprints, setCollapsedSprints] = useState<Record<number, boolean>>({});

  // Fetch Sprints for this Project
  const { data: sprints = [], refetch: refetchSprints } = useQuery({
    queryKey: ['sprints', project.id],
    queryFn: () => sprintsApi.getSprints(project.id),
  });

  // Fetch all issues for this Project
  const { data: issues = [], refetch: refetchIssues } = useQuery({
    queryKey: ['issues', project.id],
    queryFn: () => issuesApi.getIssues({ project: project.id }),
  });

  // Create Sprint Mutation
  const createSprintMutation = useMutation({
    mutationFn: (data: CreateSprintPayload) => sprintsApi.createSprint(data),
    onSuccess: (newSprint) => {
      refetchSprints();
      setCreateSprintOpen(false);
      setSprintName('');
      setSprintGoal('');
      setSprintStartDate('');
      setSprintEndDate('');
      toast.success(`Sprint "${newSprint.name}" created!`);
    },
    onError: () => toast.error('Failed to create sprint'),
  });

  // Start Sprint Mutation
  const startSprintMutation = useMutation({
    mutationFn: (sprintId: number) => sprintsApi.startSprint(sprintId),
    onSuccess: () => {
      refetchSprints();
      toast.success('Sprint started!');
    },
    onError: () => toast.error('Failed to start sprint'),
  });

  // Complete Sprint Mutation
  const completeSprintMutation = useMutation({
    mutationFn: (sprintId: number) => sprintsApi.completeSprint(sprintId),
    onSuccess: () => {
      refetchSprints();
      setActiveSprintToComplete(null);
      toast.success('Sprint completed!');
    },
    onError: () => toast.error('Failed to complete sprint'),
  });

  // Move issue to sprint/backlog
  const moveIssueSprintMutation = useMutation({
    mutationFn: ({ issueId, sprintId }: { issueId: number; sprintId: number | null }) =>
      issuesApi.updateIssue(issueId, { sprint: sprintId }),
    onSuccess: () => {
      refetchIssues();
      toast.success('Issue moved');
    },
  });

  // Group sprints by status
  const activeSprint = sprints.find((s) => s.status === 'active');
  const planningSprints = sprints.filter((s) => s.status === 'planning');

  // Issues by Sprint or Backlog
  const backlogIssues = issues.filter((i) => i.sprint === null);

  const toggleSprintCollapse = (id: number) => {
    setCollapsedSprints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderIssueRow = (issue: Issue, currentSprintId: number | null) => {
    return (
      <div
        key={issue.id}
        onClick={() => onIssueClick(issue)}
        className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-xl cursor-pointer transition-all duration-150 group"
      >
        <div className="flex items-center space-x-3 truncate">
          <IssueTypeIcon type={issue.issue_type} className="h-4 w-4 shrink-0" />
          <span className="font-mono text-xs font-semibold text-gray-400">
            #{issue.sequence_number}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
            {issue.title}
          </span>
        </div>

        <div className="flex items-center space-x-3 shrink-0 ml-4">
          {/* Quick move dropdown or button */}
          <select
            value={currentSprintId || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              moveIssueSprintMutation.mutate({ issueId: issue.id, sprintId: val });
            }}
            className="text-[11px] rounded border border-gray-200 py-1 px-1.5 text-gray-500 bg-gray-50 focus:outline-none"
          >
            <option value="">Backlog</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>

          <PriorityIcon priority={issue.priority} className="h-4 w-4" />

          {issue.story_points !== null && (
            <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
              {issue.story_points}
            </span>
          )}

          {issue.assignee ? (
            <Avatar user={issue.assignee} size="xs" />
          ) : (
            <div className="h-6 w-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
              +
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sprint Planning & Backlog</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Plan sprints, assign backlog issues, and track velocity for {project.name}.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateSprintOpen(true)}
          leftIcon={<PlusIcon className="h-4 w-4" />}
        >
          Create Sprint
        </Button>
      </div>

      {/* 1. Active Sprint Section */}
      {activeSprint && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-gray-900">{activeSprint.name}</h3>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  Active
                </span>
              </div>
              {activeSprint.goal && (
                <p className="text-xs text-gray-600 mt-1 italic">Goal: "{activeSprint.goal}"</p>
              )}
              {(activeSprint.start_date || activeSprint.end_date) && (
                <p className="text-[11px] text-gray-400 mt-1 flex items-center space-x-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(activeSprint.start_date)} - {formatDate(activeSprint.end_date)}
                  </span>
                </p>
              )}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setActiveSprintToComplete(activeSprint)}
              leftIcon={<CheckCircleIcon className="h-4 w-4 text-emerald-600" />}
            >
              Complete Sprint
            </Button>
          </div>

          {/* Progress bar */}
          {(() => {
            const sprintIssues = issues.filter((i) => i.sprint === activeSprint.id);
            const doneIssues = sprintIssues.filter((i) => i.status === 'done');
            const percent =
              sprintIssues.length > 0 ? Math.round((doneIssues.length / sprintIssues.length) * 100) : 0;
            return (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>Progress ({percent}%)</span>
                  <span>
                    {doneIssues.length} of {sprintIssues.length} issues completed
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Issue list */}
                <div className="space-y-2 pt-3">
                  {sprintIssues.map((issue) => renderIssueRow(issue, activeSprint.id))}
                  {sprintIssues.length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-400">
                      No issues in this sprint. Move issues here from backlog!
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. Planning Sprints Section */}
      <div className="space-y-4">
        {planningSprints.map((sprint) => {
          const sprintIssues = issues.filter((i) => i.sprint === sprint.id);
          const isCollapsed = collapsedSprints[sprint.id] ?? false;

          return (
            <div
              key={sprint.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleSprintCollapse(sprint.id)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600"
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </button>
                  <h4 className="text-sm font-bold text-gray-900">{sprint.name}</h4>
                  <span className="text-xs text-gray-400">({sprintIssues.length} issues)</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startSprintMutation.mutate(sprint.id)}
                  leftIcon={<PlayIcon className="h-3.5 w-3.5" />}
                >
                  Start Sprint
                </Button>
              </div>

              {!isCollapsed && (
                <div className="space-y-2 pt-1">
                  {sprintIssues.map((issue) => renderIssueRow(issue, sprint.id))}
                  {sprintIssues.length === 0 && (
                    <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      Drag or move issues into this sprint
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Backlog Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Backlog</h3>
            <p className="text-xs text-gray-400">Issues not assigned to any sprint</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
            {backlogIssues.length} issues
          </span>
        </div>

        <div className="space-y-2">
          {backlogIssues.map((issue) => renderIssueRow(issue, null))}
          {backlogIssues.length === 0 && (
            <p className="text-center py-8 text-xs text-gray-400">
              Backlog is empty! Create new issues to plan work.
            </p>
          )}
        </div>
      </div>

      {/* Create Sprint Modal */}
      <Modal
        isOpen={createSprintOpen}
        onClose={() => setCreateSprintOpen(false)}
        title="Create Sprint"
        description="Plan a new sprint iteration for your team."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (sprintName.trim()) {
              createSprintMutation.mutate({
                project: project.id,
                name: sprintName.trim(),
                goal: sprintGoal.trim() || undefined,
                start_date: sprintStartDate || null,
                end_date: sprintEndDate || null,
              });
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Sprint Name *"
            placeholder="Sprint 1, Sprint 2, etc."
            value={sprintName}
            onChange={(e) => setSprintName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Sprint Goal
            </label>
            <textarea
              rows={2}
              value={sprintGoal}
              onChange={(e) => setSprintGoal(e.target.value)}
              placeholder="What are we trying to achieve this sprint?"
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={sprintStartDate}
                onChange={(e) => setSprintStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={sprintEndDate}
                onChange={(e) => setSprintEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateSprintOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createSprintMutation.isPending}
              disabled={!sprintName.trim()}
            >
              Create Sprint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Sprint Dialog */}
      {activeSprintToComplete && (
        <ConfirmDialog
          isOpen={!!activeSprintToComplete}
          onClose={() => setActiveSprintToComplete(null)}
          onConfirm={() => completeSprintMutation.mutate(activeSprintToComplete.id)}
          title={`Complete ${activeSprintToComplete.name}?`}
          message="Incomplete issues in this sprint will remain or can be moved to the backlog or next sprint."
          confirmLabel="Complete Sprint"
          variant="primary"
          isLoading={completeSprintMutation.isPending}
        />
      )}
    </div>
  );
};

export default BacklogView;
