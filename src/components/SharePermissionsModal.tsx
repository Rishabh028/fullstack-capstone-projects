'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Users, Shield, Copy, Check, UserPlus, X } from 'lucide-react';
import { Role } from '@/types';

interface Member {
  id: string;
  role: Role;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    color: string;
  };
}

interface SharePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  currentUserRole?: Role;
}

export const SharePermissionsModal: React.FC<SharePermissionsModalProps> = ({
  isOpen,
  onClose,
  workspaceSlug,
  currentUserRole = 'EDITOR',
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('EDITOR');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canManageRoles = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  useEffect(() => {
    if (!isOpen) return;
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceSlug}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    };
    fetchMembers();
  }, [isOpen, workspaceSlug]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || loading) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`/api/workspaces/${workspaceSlug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to add member');
        return;
      }

      setMembers((prev) => [...prev, data.member]);
      setInviteEmail('');
    } catch (err) {
      setErrorMsg('Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (!canManageRoles) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (res.ok) {
        const data = await res.json();
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: data.member.role } : m))
        );
      }
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Share & Permissions
              </h3>
              <p className="text-xs text-slate-500">
                Manage roles: View, Comment, Edit, and Admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy Link Section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
            {typeof window !== 'undefined' ? window.location.href : ''}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Invite Form */}
        {canManageRoles && (
          <form onSubmit={handleInvite} className="p-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Invite collaborator
            </span>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="alice@example.com..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="VIEWER">Can View</option>
                <option value="EDITOR">Can Edit</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-500 mt-1.5">{errorMsg}</p>}
          </form>
        )}

        {/* Members List */}
        <div className="p-4 max-h-60 overflow-y-auto space-y-2.5">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Workspace Members ({members.length})
          </span>
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                  style={{ backgroundColor: m.user.color || '#6366f1' }}
                >
                  {m.user.name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {m.user.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">{m.user.email}</p>
                </div>
              </div>

              {canManageRoles && m.role !== 'OWNER' ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                  className="text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="VIEWER">Can View</option>
                  <option value="EDITOR">Can Edit</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ) : (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {m.role === 'OWNER' ? 'Workspace Owner' : m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
