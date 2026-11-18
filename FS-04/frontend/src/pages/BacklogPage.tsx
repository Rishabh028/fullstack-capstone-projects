import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import projectsApi from '@/api/projects';
import BacklogView from '@/components/sprint/BacklogView';
import IssueDetail from '@/components/issues/IssueDetail';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { Issue } from '@/types';

export const BacklogPage: React.FC = () => {
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug: string; projectKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectKey],
    queryFn: () => projectsApi.getProject(projectKey!),
    enabled: !!projectKey,
  });

  if (isLoading) {
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
        description="The project could not be found."
        action={{
          label: 'Back to Projects',
          onClick: () => navigate(`/${workspaceSlug}/projects`),
        }}
      />
    );
  }

  return (
    <div>
      <BacklogView
        project={project}
        onIssueClick={(issue: Issue) => setSelectedIssueId(issue.id)}
      />

      {/* Slide-over detail panel */}
      <IssueDetail
        issueId={selectedIssueId}
        isOpen={!!selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['issues', project.id] });
        }}
        onDeleted={() => {
          setSelectedIssueId(null);
          queryClient.invalidateQueries({ queryKey: ['issues', project.id] });
        }}
      />
    </div>
  );
};

export default BacklogPage;
