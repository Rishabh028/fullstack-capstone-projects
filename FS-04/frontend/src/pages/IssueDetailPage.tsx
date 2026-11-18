import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import IssueDetail from '@/components/issues/IssueDetail';
import Button from '@/components/ui/Button';

export const IssueDetailPage: React.FC = () => {
  const { workspaceSlug, issueId } = useParams<{ workspaceSlug: string; issueId: string }>();
  const navigate = useNavigate();

  const numericIssueId = issueId ? Number(issueId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 min-h-[500px]">
        <IssueDetail
          issueId={numericIssueId}
          isOpen={true}
          onClose={() => navigate(-1)}
          onDeleted={() => navigate(`/${workspaceSlug}/projects`)}
        />
      </div>
    </div>
  );
};

export default IssueDetailPage;
