import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FolderIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UsersIcon,
  PlusIcon,
  UserPlusIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { isPast, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import workspacesApi from '@/api/workspaces';
import projectsApi from '@/api/projects';
import issuesApi from '@/api/issues';
import auditLogApi from '@/api/auditLog';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge, { PriorityIcon, IssueTypeIcon } from '@/components/ui/Badge';
import CreateIssueModal from '@/components/issues/CreateIssueModal';
import IssueDetail from '@/components/issues/IssueDetail';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Issue, AuditLog } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  backlog: '#94a3b8',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  in_review: '#8b5cf6',
  done: '#10b981',
  cancelled: '#f43f5e',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  const workspaceSlug = currentWorkspace?.slug;
  const workspaceId = currentWorkspace?.id;

  // 1. Fetch Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: () => projectsApi.getProjects(workspaceSlug),
    enabled: !!workspaceSlug,
  });

  // 2. Fetch Issues
  const { data: issues = [] } = useQuery({
    queryKey: ['issues', workspaceId],
    queryFn: () => issuesApi.getIssues({ workspace: workspaceId }),
    enabled: !!workspaceId,
  });

  // 3. Fetch Members
  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members', workspaceSlug],
    queryFn: () => workspacesApi.getMembers(workspaceSlug!),
    enabled: !!workspaceSlug,
  });

  // 4. Fetch Audit Logs
  const { data: auditLogsData } = useQuery({
    queryKey: ['audit-logs', workspaceSlug],
    queryFn: () => auditLogApi.getAuditLog(workspaceSlug!, { limit: 10 }),
    enabled: !!workspaceSlug,
  });
  const recentLogs = auditLogsData?.results || [];

  // Stats
  const openIssues = issues.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
  const overdueIssues = issues.filter(
    (i) =>
      i.due_date &&
      i.status !== 'done' &&
      i.status !== 'cancelled' &&
      isPast(parseISO(i.due_date))
  );

  // Issues by status for recharts BarChart
  const statusCounts = issues.reduce((acc, issue) => {
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'Backlog', key: 'backlog', count: statusCounts.backlog || 0, color: STATUS_COLORS.backlog },
    { name: 'To Do', key: 'todo', count: statusCounts.todo || 0, color: STATUS_COLORS.todo },
    { name: 'In Progress', key: 'in_progress', count: statusCounts.in_progress || 0, color: STATUS_COLORS.in_progress },
    { name: 'In Review', key: 'in_review', count: statusCounts.in_review || 0, color: STATUS_COLORS.in_review },
    { name: 'Done', key: 'done', count: statusCounts.done || 0, color: STATUS_COLORS.done },
  ];

  // Recent issues: last 10 updated
  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceSlug || !inviteEmail.trim()) return;

    try {
      await workspacesApi.inviteMember(workspaceSlug, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteModalOpen(false);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner & Quick action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Good day, {user?.first_name || 'there'}! 👋
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Here's what is happening across <span className="font-semibold text-gray-700">{currentWorkspace?.name}</span> today.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setInviteModalOpen(true)}
            leftIcon={<UserPlusIcon className="h-4 w-4" />}
          >
            Invite Member
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateIssueOpen(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            Create Issue
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Projects */}
        <div
          onClick={() => navigate(`/${workspaceSlug}/projects`)}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Projects</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FolderIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-gray-900">{projects.length}</p>
          <p className="mt-1 text-[11px] text-gray-400">Active workspaces projects</p>
        </div>

        {/* Open Issues */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Open Issues</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-gray-900">{openIssues.length}</p>
          <p className="mt-1 text-[11px] text-gray-400">Needs resolution</p>
        </div>

        {/* Overdue Issues */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Overdue</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <ExclamationCircleIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-red-600">{overdueIssues.length}</p>
          <p className="mt-1 text-[11px] text-red-400">Past target completion date</p>
        </div>

        {/* Team Members */}
        <div
          onClick={() => navigate(`/${workspaceSlug}/settings`)}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Team Members</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-gray-900">{members.length}</p>
          <p className="mt-1 text-[11px] text-gray-400">Collaborators in workspace</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Issues vs Status Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Issues (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            title="Recent Issues"
            subtitle="Last updated issues across projects"
            action={
              <button
                type="button"
                onClick={() => navigate(`/${workspaceSlug}/projects`)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRightIcon className="h-3 w-3" />
              </button>
            }
          >
            <div className="divide-y divide-gray-100">
              {recentIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50/80 -mx-3 px-3 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <IssueTypeIcon type={issue.issue_type} className="h-4 w-4 shrink-0" />
                    <span className="font-mono text-xs font-semibold text-gray-400">
                      #{issue.sequence_number}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600">
                      {issue.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-3">
                    <Badge status={issue.status} size="sm" />
                    <PriorityIcon priority={issue.priority} className="h-4 w-4" />
                    {issue.assignee ? (
                      <Avatar user={issue.assignee} size="xs" />
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
                        -
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {recentIssues.length === 0 && (
                <div className="py-12 text-center text-xs text-gray-400">
                  No issues found. Create your first issue!
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Issues by Status Bar Chart & Activity Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card
            title="Sprint & Status Overview"
            subtitle="Distribution of current issues"
          >
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card
            title="Recent Activity"
            subtitle="Workspace events & updates"
            action={
              <button
                type="button"
                onClick={() => navigate(`/${workspaceSlug}/audit-log`)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Audit Log
              </button>
            }
          >
            <div className="space-y-3">
              {recentLogs.slice(0, 5).map((log: AuditLog) => (
                <div key={log.id} className="flex items-start space-x-2.5 text-xs text-gray-600">
                  <Avatar user={log.user} size="xs" />
                  <div className="flex-1 truncate">
                    <p className="truncate">
                      <span className="font-semibold text-gray-900">
                        {log.user?.first_name} {log.user?.last_name}
                      </span>{' '}
                      <span>{log.action}</span>
                      {log.field_name && (
                        <span className="font-medium text-gray-800"> {log.field_name}</span>
                      )}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                </div>
              ))}

              {recentLogs.length === 0 && (
                <p className="py-6 text-center text-xs text-gray-400">
                  No activity recorded yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Global Create Issue Modal */}
      <CreateIssueModal
        isOpen={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
      />

      {/* Issue Detail Slide-over */}
      <IssueDetail
        issueId={selectedIssueId}
        isOpen={!!selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
      />

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Workspace Member"
        description="Add a teammate to collaborate in this workspace."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email Address *"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="admin">Admin (Can manage projects, billing & members)</option>
              <option value="member">Member (Can create & edit issues and sprints)</option>
              <option value="viewer">Viewer (Read-only access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!inviteEmail.trim()}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DashboardPage;
