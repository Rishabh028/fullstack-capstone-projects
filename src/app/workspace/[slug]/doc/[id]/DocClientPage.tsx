'use client';

import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { Navbar } from '@/components/Navbar';
import { CollaborativeEditor } from '@/components/CollaborativeEditor';
import { CommentsPanel } from '@/components/CommentsPanel';
import { VersionHistoryModal } from '@/components/VersionHistoryModal';
import { SharePermissionsModal } from '@/components/SharePermissionsModal';
import { UserSummary, CommentItem, SnapshotItem, Role } from '@/types';

interface DocClientPageProps {
  document: {
    id: string;
    title: string;
    icon?: string | null;
    type: 'DOCUMENT' | 'CANVAS';
    workspaceId: string;
  };
  workspaceSlug: string;
  currentUser: UserSummary;
  currentUserRole?: Role;
  initialComments: CommentItem[];
  initialSnapshots: SnapshotItem[];
}

export const DocClientPage: React.FC<DocClientPageProps> = ({
  document,
  workspaceSlug,
  currentUser,
  currentUserRole = 'EDITOR',
  initialComments,
  initialSnapshots,
}) => {
  const [title, setTitle] = useState(document.title);
  const [icon, setIcon] = useState(document.icon || '📄');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>(initialSnapshots);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number; text: string } | null>(null);
  const [activeYdoc, setActiveYdoc] = useState<Y.Doc | null>(null);

  const isReadOnly = currentUserRole === 'VIEWER';

  const handleUpdateTitle = async (newTitle: string) => {
    setTitle(newTitle);
    try {
      await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  const handleUpdateIcon = async (newIcon: string) => {
    setIcon(newIcon);
    try {
      await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: newIcon }),
      });
    } catch (err) {
      console.error('Failed to update icon:', err);
    }
  };

  const handleOpenCommentWithSelection = (range: { from: number; to: number; text: string }) => {
    setSelectedRange(range);
    setIsCommentsOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      {/* Top Navbar */}
      <Navbar
        documentId={document.id}
        title={title}
        icon={icon}
        type={document.type}
        collaborators={collaborators}
        commentsCount={comments.filter((c) => !c.resolved).length}
        currentUserRole={currentUserRole}
        onUpdateTitle={handleUpdateTitle}
        onUpdateIcon={handleUpdateIcon}
        onOpenComments={() => setIsCommentsOpen(!isCommentsOpen)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        isReadOnly={isReadOnly}
      />

      {/* Main Document Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <CollaborativeEditor
          documentId={document.id}
          currentUser={currentUser}
          isReadOnly={isReadOnly}
          onOpenCommentModal={handleOpenCommentWithSelection}
          onCollaboratorsChange={setCollaborators}
          onDocChange={setActiveYdoc}
        />
      </div>

      {/* Slide-out Comments Panel */}
      <CommentsPanel
        documentId={document.id}
        comments={comments}
        currentUser={currentUser}
        initialSelection={selectedRange}
        isOpen={isCommentsOpen}
        onClose={() => {
          setIsCommentsOpen(false);
          setSelectedRange(null);
        }}
        onCommentCreated={(newComment) => {
          setComments((prev) => [newComment, ...prev]);
          setSelectedRange(null);
        }}
        onCommentUpdated={(updatedComment) => {
          setComments((prev) =>
            prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
          );
        }}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        documentId={document.id}
        ydoc={activeYdoc}
        snapshots={snapshots}
        currentUser={currentUser}
        isReadOnly={isReadOnly}
        onSnapshotCreated={(newSnapshot) => {
          setSnapshots((prev) => [newSnapshot, ...prev]);
        }}
      />

      {/* Share / Permissions Modal */}
      <SharePermissionsModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        workspaceSlug={workspaceSlug}
        currentUserRole={currentUserRole}
      />
    </div>
  );
};
