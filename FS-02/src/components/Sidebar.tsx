'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Palette,
  Plus,
  Search,
  Settings,
  ChevronDown,
  LogOut,
  Trash2,
  FolderPlus,
  Users,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';
import { DocumentItem, UserSummary, Role } from '@/types';

interface SidebarProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    currentUserRole?: Role;
  };
  documents: DocumentItem[];
  currentUser: UserSummary;
  onOpenSearch: () => void;
  onOpenShareModal: () => void;
  onRefreshDocs?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  documents,
  currentUser,
  onOpenSearch,
  onOpenShareModal,
  onRefreshDocs,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const canCreate = workspace.currentUserRole !== 'VIEWER';

  const handleCreateDocument = async (type: 'DOCUMENT' | 'CANVAS') => {
    if (!canCreate || creating) return;
    try {
      setCreating(true);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          title: type === 'CANVAS' ? 'New Whiteboard' : 'New Document',
          type,
          icon: type === 'CANVAS' ? '🎨' : '📄',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (onRefreshDocs) onRefreshDocs();
        if (type === 'CANVAS') {
          router.push(`/workspace/${workspace.slug}/canvas/${data.document.id}`);
        } else {
          router.push(`/workspace/${workspace.slug}/doc/${data.document.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to create page:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 h-screen bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Top Workspace Header */}
      <div>
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link
            href={`/workspace/${workspace.slug}`}
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <span className="text-xl p-1 bg-white dark:bg-slate-900 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-800">
              {workspace.icon || '🚀'}
            </span>
            <div className="truncate">
              <h2 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                {workspace.name}
              </h2>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                {workspace.currentUserRole || 'EDITOR'}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onOpenShareModal}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title="Invite & Permissions"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-3 space-y-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search docs...</span>
            </div>
            <kbd className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              Ctrl+K
            </kbd>
          </button>

          <Link
            href={`/workspace/${workspace.slug}`}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === `/workspace/${workspace.slug}`
                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Workspace Overview</span>
          </Link>
        </div>

        {/* Pages Header & Quick Add */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Documents & Canvases
          </span>
          {canCreate && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCreateDocument('DOCUMENT')}
                disabled={creating}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="New Text Document"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleCreateDocument('CANVAS')}
                disabled={creating}
                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="New Figma Canvas"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Document Tree */}
        <div className="px-2 py-1 max-h-[calc(100vh-280px)] overflow-y-auto space-y-0.5">
          {documents.length === 0 ? (
            <div className="text-[11px] text-slate-400 px-3 py-4 text-center">
              No documents created yet.
            </div>
          ) : (
            documents.map((doc) => {
              const href =
                doc.type === 'CANVAS'
                  ? `/workspace/${workspace.slug}/canvas/${doc.id}`
                  : `/workspace/${workspace.slug}/doc/${doc.id}`;
              const isActive = pathname === href;

              return (
                <Link
                  key={doc.id}
                  href={href}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors group ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0">
                      {doc.icon || (doc.type === 'CANVAS' ? '🎨' : '📄')}
                    </span>
                    <span className="truncate">{doc.title}</span>
                  </div>
                  {doc.type === 'CANVAS' && (
                    <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 uppercase shrink-0 font-bold">
                      Canvas
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: currentUser.color || '#6366f1' }}
            >
              {currentUser.name[0]}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {currentUser.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
