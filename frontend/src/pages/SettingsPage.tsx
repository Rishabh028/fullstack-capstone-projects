import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  UsersIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '@/store/workspaceStore';
import workspacesApi, {
  UpdateWorkspacePayload,
  InviteMemberPayload,
} from '@/api/workspaces';
import webhooksApi, { CreateWebhookPayload } from '@/api/webhooks';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Tabs from '@/components/ui/Tabs';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import { WorkspaceMember, Webhook } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const AVAILABLE_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'sprint.started',
  'sprint.completed',
  'comment.created',
];

export const SettingsPage: React.FC = () => {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace, setCurrentWorkspace, resetWorkspace } = useWorkspaceStore();

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');

  // Invite member state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  // Webhook state
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['issue.created', 'issue.updated']);

  // Danger Zone
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const activeSlug = currentWorkspace?.slug || workspaceSlug;

  // 1. Fetch current workspace details
  const { data: workspace, isLoading: isWorkspaceLoading } = useQuery({
    queryKey: ['workspace', activeSlug],
    queryFn: () => workspacesApi.getWorkspace(activeSlug!),
    enabled: !!activeSlug,
  });

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name || '');
      setWorkspaceDesc(workspace.description || '');
    }
  }, [workspace]);

  // 2. Fetch Members
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['workspace-members', activeSlug],
    queryFn: () => workspacesApi.getMembers(activeSlug!),
    enabled: !!activeSlug,
  });

  // 3. Fetch Webhooks
  const { data: webhooks = [], refetch: refetchWebhooks } = useQuery({
    queryKey: ['webhooks', activeSlug],
    queryFn: () => webhooksApi.getWebhooks(activeSlug!),
    enabled: !!activeSlug,
  });

  // Update Workspace Mutation
  const updateWorkspaceMutation = useMutation({
    mutationFn: (data: UpdateWorkspacePayload) =>
      workspacesApi.updateWorkspace(activeSlug!, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', activeSlug] });
      setCurrentWorkspace(updated);
      toast.success('Workspace updated successfully');
    },
    onError: () => toast.error('Failed to update workspace'),
  });

  // Invite Member Mutation
  const inviteMemberMutation = useMutation({
    mutationFn: (data: InviteMemberPayload) =>
      workspacesApi.inviteMember(activeSlug!, data),
    onSuccess: () => {
      refetchMembers();
      setInviteModalOpen(false);
      setInviteEmail('');
      toast.success('Invitation sent!');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Failed to send invite'),
  });

  // Update Member Role Mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: number;
      role: 'owner' | 'admin' | 'member' | 'viewer';
    }) => workspacesApi.updateMember(activeSlug!, memberId, role),
    onSuccess: () => {
      refetchMembers();
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: number) => workspacesApi.removeMember(activeSlug!, memberId),
    onSuccess: () => {
      refetchMembers();
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: (data: CreateWebhookPayload) =>
      webhooksApi.createWebhook(activeSlug!, data),
    onSuccess: () => {
      refetchWebhooks();
      setWebhookModalOpen(false);
      setWebhookName('');
      setWebhookUrl('');
      toast.success('Webhook created!');
    },
    onError: () => toast.error('Failed to create webhook'),
  });

  // Delete Webhook Mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: (webhookId: number) =>
      webhooksApi.deleteWebhook(activeSlug!, webhookId),
    onSuccess: () => {
      refetchWebhooks();
      toast.success('Webhook deleted');
    },
    onError: () => toast.error('Failed to delete webhook'),
  });

  // Delete Workspace Mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => workspacesApi.deleteWorkspace(activeSlug!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      resetWorkspace();
      toast.success('Workspace deleted');
      navigate('/dashboard');
    },
    onError: () => toast.error('Failed to delete workspace'),
  });

  const toggleEventSelection = (ev: string) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  if (isWorkspaceLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const tabs = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: <BuildingOffice2Icon className="h-4 w-4" />,
      content: (
        <Card title="Workspace Settings" subtitle="Update name and details for this organization">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateWorkspaceMutation.mutate({
                name: workspaceName,
                description: workspaceDesc,
              });
            }}
            className="space-y-4 max-w-xl"
          >
            <Input
              label="Workspace Name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={workspaceDesc}
                onChange={(e) => setWorkspaceDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="sm"
                isLoading={updateWorkspaceMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      ),
    },
    {
      id: 'members',
      label: 'Members',
      count: members.length,
      icon: <UsersIcon className="h-4 w-4" />,
      content: (
        <Card
          title="Team Members"
          subtitle="Manage who has access to projects and boards in this workspace"
          action={
            <Button
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Invite Member
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead>
                <tr className="text-gray-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Member</th>
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2">Joined</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member: WorkspaceMember) => (
                  <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-3">
                        <Avatar user={member.user} size="sm" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {member.user.first_name} {member.user.last_name}
                          </p>
                          <p className="text-gray-400 text-[11px]">{member.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateMemberRoleMutation.mutate({
                            memberId: member.id,
                            role: e.target.value as any,
                          })
                        }
                        className="rounded-lg border-gray-300 py-1 px-2 text-xs text-gray-700 focus:outline-none"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 text-gray-500">
                      {formatDate(member.joined_at, 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove member"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ),
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      count: webhooks.length,
      icon: <GlobeAltIcon className="h-4 w-4" />,
      content: (
        <Card
          title="Webhooks"
          subtitle="Trigger external URLs on issue and sprint events"
          action={
            <Button
              size="sm"
              onClick={() => setWebhookModalOpen(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Webhook
            </Button>
          }
        >
          <div className="space-y-3">
            {webhooks.map((hook: Webhook) => (
              <div
                key={hook.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{hook.name}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        hook.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <p className="font-mono text-[11px] text-gray-500 mt-0.5">{hook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {hook.events.map((e) => (
                      <span
                        key={e}
                        className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono text-indigo-700"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteWebhookMutation.mutate(hook.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}

            {webhooks.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                No webhooks configured. Add a webhook to receive real-time JSON payloads.
              </div>
            )}
          </div>
        </Card>
      ),
    },
    {
      id: 'danger',
      label: 'Danger Zone',
      icon: <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />,
      content: (
        <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-red-700">Delete Workspace</h3>
            <p className="text-xs text-red-600/80 mt-1">
              Permanently delete this workspace and all associated projects, issues, sprints, and
              member records. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete this workspace
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Workspace Settings</h1>
        <p className="mt-1 text-xs text-gray-500">
          Manage configuration, members, integrations, and security.
        </p>
      </div>

      <Tabs tabs={tabs} variant="underline" />

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Member"
        description="Invite a team member to join this workspace."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inviteEmail.trim()) {
              inviteMemberMutation.mutate({
                email: inviteEmail.trim(),
                role: inviteRole,
              });
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
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
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
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
            <Button
              type="submit"
              size="sm"
              isLoading={inviteMemberMutation.isPending}
              disabled={!inviteEmail.trim()}
            >
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Webhook Modal */}
      <Modal
        isOpen={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        title="Create Webhook"
        description="Enter endpoint destination and select event triggers."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (webhookName.trim() && webhookUrl.trim()) {
              createWebhookMutation.mutate({
                name: webhookName.trim(),
                url: webhookUrl.trim(),
                events: selectedEvents,
                is_active: true,
              });
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Webhook Name"
            placeholder="e.g. Slack Dispatcher"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Endpoint URL"
            type="url"
            placeholder="https://api.yourdomain.com/webhooks"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Event Triggers
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((ev) => {
                const checked = selectedEvents.includes(ev);
                return (
                  <label
                    key={ev}
                    onClick={() => toggleEventSelection(ev)}
                    className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      checked
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 pointer-events-none"
                    />
                    <span>{ev}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setWebhookModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createWebhookMutation.isPending}
              disabled={!webhookName.trim() || !webhookUrl.trim() || selectedEvents.length === 0}
            >
              Create Webhook
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Workspace Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteWorkspaceMutation.mutate()}
        title="Delete Workspace?"
        message={`Are you sure you want to permanently delete "${workspace?.name}"? All project boards, issues, and data will be erased.`}
        confirmLabel="Delete Workspace"
        variant="danger"
        isLoading={deleteWorkspaceMutation.isPending}
      />
    </div>
  );
};

export default SettingsPage;
