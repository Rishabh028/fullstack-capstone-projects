'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SearchModal } from '@/components/SearchModal';
import { SharePermissionsModal } from '@/components/SharePermissionsModal';
import { DocumentItem, UserSummary, Role } from '@/types';

interface WorkspaceShellProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    currentUserRole?: Role;
  };
  initialDocuments: DocumentItem[];
  currentUser: UserSummary;
  children: React.ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  workspace,
  initialDocuments,
  currentUser,
  children,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Sync documents list
  const refreshDocuments = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.workspace.documents);
      }
    } catch (err) {
      console.error('Error refreshing documents:', err);
    }
  };

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        workspace={workspace}
        documents={documents}
        currentUser={currentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShareModal={() => setIsShareOpen(true)}
        onRefreshDocs={refreshDocuments}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 h-screen overflow-y-auto flex flex-col">
        {children}
      </main>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        workspaceSlug={workspace.slug}
        documents={documents}
      />

      {/* Permissions Modal */}
      <SharePermissionsModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        workspaceSlug={workspace.slug}
        currentUserRole={workspace.currentUserRole}
      />
    </div>
  );
};
