import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  FolderIcon,
  ChevronRightIcon,
  ViewColumnsIcon,
  QueueListIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '@/store/workspaceStore';
import projectsApi, { CreateProjectPayload } from '@/api/projects';
import boardsApi from '@/api/boards';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { Project } from '@/types';
import toast from 'react-hot-toast';

const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace, setCurrentProject } = useWorkspaceStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState('📁');

  const workspaceSlug = currentWorkspace?.slug;
  const workspaceId = currentWorkspace?.id;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: () => projectsApi.getProjects(workspaceSlug),
    enabled: !!workspaceSlug,
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate project key (e.g. "Frontend Platform" -> "FP")
    if (!key || key.length <= 4) {
      const generated = val
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
      if (generated) setKey(generated);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const newProj = await projectsApi.createProject(payload);
      // Automatically create a default Kanban board for this project
      try {
        await boardsApi.createBoard({
          project: newProj.id,
          name: `${newProj.name} Board`,
          board_type: 'kanban',
          is_default: true,
        });
      } catch {
        // ignore if board created on backend automatically
      }
      return newProj;
    },
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceSlug] });
      toast.success(`Project ${newProj.name} created!`);
      setCreateModalOpen(false);
      setName('');
      setKey('');
      setDescription('');
      setCurrentProject(newProj);
      navigate(`/${workspaceSlug}/projects/${newProj.key}/board`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim() || !key.trim()) return;

    createMutation.mutate({
      workspace: workspaceId,
      name: name.trim(),
      key: key.trim().toUpperCase(),
      description: description.trim(),
      color,
      icon,
    });
  };

  const handleProjectClick = (project: Project) => {
    setCurrentProject(project);
    navigate(`/${workspaceSlug}/projects/${project.key}/board`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
          <p className="mt-1 text-xs text-gray-500">
            Manage your workspaces projects, boards, and deliverables.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          size="sm"
          leftIcon={<PlusIcon className="h-4 w-4" />}
        >
          Create Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-lg shadow-xs"
                      style={{
                        backgroundColor: `${project.color || '#6366f1'}15`,
                        color: project.color || '#6366f1',
                      }}
                    >
                      {project.icon || '📁'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>
                      <span className="font-mono text-xs font-semibold text-gray-400">
                        {project.key}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      project.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <p className="mt-3 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Card Footer: Lead & Quick links */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {project.lead ? (
                    <div className="flex items-center space-x-1.5" title={`Project Lead: ${project.lead.first_name}`}>
                      <Avatar user={project.lead} size="xs" />
                      <span className="text-[11px] text-gray-500 font-medium">
                        {project.lead.first_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400">No Lead</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentProject(project);
                      navigate(`/${workspaceSlug}/projects/${project.key}/backlog`);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Backlog & Sprints"
                  >
                    <QueueListIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentProject(project);
                      navigate(`/${workspaceSlug}/projects/${project.key}/board`);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Kanban Board"
                  >
                    <ViewColumnsIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isLoading && (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start tracking sprints, boards, and issues with your team."
            action={{
              label: 'Create Project',
              onClick: () => setCreateModalOpen(true),
              icon: <PlusIcon className="h-4 w-4" />,
            }}
          />
        )
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        description="A project organizes issues, boards, and sprints for a specific product or team."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Project Name *"
            placeholder="e.g. Web App Redesign"
            value={name}
            onChange={handleNameChange}
            required
            autoFocus
          />

          <Input
            label="Project Key *"
            placeholder="e.g. WAR"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            helperText="Used as issue prefix (e.g. WAR-101)"
            maxLength={10}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is the goal of this project?"
              className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Color & Icon Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Icon (Emoji)
              </label>
              <input
                type="text"
                maxLength={4}
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-center text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Theme Color
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createMutation.isPending}
              disabled={!name.trim() || !key.trim()}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
