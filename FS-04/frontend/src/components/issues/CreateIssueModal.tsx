import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useWorkspaceStore } from '@/store/workspaceStore';
import issuesApi, { CreateIssuePayload } from '@/api/issues';
import projectsApi from '@/api/projects';
import workspacesApi from '@/api/workspaces';
import sprintsApi from '@/api/sprints';
import { IssueStatus, IssueType, Priority } from '@/types';
import toast from 'react-hot-toast';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: IssueStatus;
  defaultProjectId?: number;
  defaultSprintId?: number | null;
  onSuccess?: () => void;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  defaultStatus = 'todo',
  defaultProjectId,
  defaultSprintId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { currentWorkspace, currentProject } = useWorkspaceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number | undefined>(
    defaultProjectId || currentProject?.id
  );
  const [issueType, setIssueType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [sprintId, setSprintId] = useState<number | ''>(defaultSprintId || '');
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState<string>('');

  const workspaceSlug = currentWorkspace?.slug;
  const workspaceId = currentWorkspace?.id;

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: () => projectsApi.getProjects(workspaceSlug),
    enabled: !!workspaceSlug,
  });

  const effectiveProjectId = projectId || (projects.length > 0 ? projects[0].id : undefined);

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members', workspaceSlug],
    queryFn: () => workspacesApi.getMembers(workspaceSlug!),
    enabled: !!workspaceSlug,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', effectiveProjectId],
    queryFn: () => sprintsApi.getSprints(effectiveProjectId!),
    enabled: !!effectiveProjectId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateIssuePayload) => issuesApi.createIssue(payload),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`Issue created: ${newIssue.title}`);
      onClose();
      resetForm();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create issue');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIssueType('task');
    setPriority('medium');
    setStatus(defaultStatus);
    setAssigneeId('');
    setSprintId('');
    setStoryPoints('');
    setDueDate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !effectiveProjectId || !title.trim()) {
      toast.error('Please specify a project and title.');
      return;
    }

    createMutation.mutate({
      workspace: workspaceId,
      project: effectiveProjectId,
      title: title.trim(),
      description,
      issue_type: issueType,
      priority,
      status,
      assignee: assigneeId ? Number(assigneeId) : null,
      sprint: sprintId ? Number(sprintId) : null,
      story_points: storyPoints !== '' ? Number(storyPoints) : null,
      due_date: dueDate || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Issue"
      description="Create a new task, bug, story or epic."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Project <span className="text-red-500">*</span>
          </label>
          <select
            value={effectiveProjectId || ''}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <Input
          label="Title *"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, acceptance criteria, steps to reproduce..."
            className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Type, Priority, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="lowest">Lowest</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Assignee & Sprint */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.first_name} {m.user.last_name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Sprint
            </label>
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : '')}
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">No sprint (Backlog)</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Story Points & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Story Points
            </label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 1, 2, 3, 5, 8"
              value={storyPoints}
              onChange={(e) =>
                setStoryPoints(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={createMutation.isPending}
            disabled={!title.trim() || !effectiveProjectId}
          >
            Create Issue
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateIssueModal;
