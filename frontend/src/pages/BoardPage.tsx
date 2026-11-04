import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import projectsApi from '@/api/projects';
import boardsApi from '@/api/boards';
import issuesApi from '@/api/issues';
import workspacesApi from '@/api/workspaces';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import IssueDetail from '@/components/issues/IssueDetail';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { Board, Issue } from '@/types';
import toast from 'react-hot-toast';

export const BoardPage: React.FC = () => {
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug: string; projectKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  // 1. Get Project
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectKey],
    queryFn: () => projectsApi.getProject(projectKey!),
    enabled: !!projectKey,
  });

  // 2. Get Boards for Project
  const { data: boards = [], isLoading: isBoardsLoading, refetch: refetchBoards } = useQuery({
    queryKey: ['boards', project?.id],
    queryFn: () => boardsApi.getBoards(project!.id),
    enabled: !!project?.id,
  });

  // 3. Get Workspace Members (for filters)
  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members', workspaceSlug],
    queryFn: () => workspacesApi.getMembers(workspaceSlug!),
    enabled: !!workspaceSlug,
  });

  const memberUsers = members.map((m) => m.user);

  // Default / First Board
  const activeBoard = boards.find((b) => b.is_default) || boards[0];

  // 4. Get Issues for Project & Board
  const {
    data: issues = [],
    isLoading: isIssuesLoading,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['issues', project?.id, activeBoard?.id],
    queryFn: () =>
      issuesApi.getIssues({
        project: project!.id,
        board: activeBoard?.id,
      }),
    enabled: !!project?.id,
  });

  // Create default board mutation if missing
  const createBoardMutation = useMutation({
    mutationFn: () =>
      boardsApi.createBoard({
        project: project!.id,
        name: `${project!.name} Kanban Board`,
        board_type: 'kanban',
        is_default: true,
      }),
    onSuccess: () => {
      refetchBoards();
      toast.success('Board created!');
    },
  });

  if (isProjectLoading || isBoardsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="The requested project does not exist in this workspace."
        action={{
          label: 'Back to Projects',
          onClick: () => navigate(`/${workspaceSlug}/projects`),
        }}
      />
    );
  }

  // If no board exists yet, render prompt to create board
  if (!activeBoard) {
    return (
      <EmptyState
        title="No board found"
        description={`No Kanban board configured for project ${project.name}.`}
        action={{
          label: 'Create Kanban Board',
          onClick: () => createBoardMutation.mutate(),
          icon: <PlusIcon className="h-4 w-4" />,
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Board component */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          board={activeBoard}
          issues={issues}
          members={memberUsers}
          onIssueClick={(issue) => setSelectedIssueId(issue.id)}
          onRefresh={() => {
            refetchIssues();
          }}
        />
      </div>

      {/* Issue Detail Slide-over */}
      <IssueDetail
        issueId={selectedIssueId}
        isOpen={!!selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onUpdated={() => refetchIssues()}
        onDeleted={() => {
          setSelectedIssueId(null);
          refetchIssues();
        }}
      />
    </div>
  );
};

export default BoardPage;
