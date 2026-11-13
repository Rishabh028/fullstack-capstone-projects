import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CanvasClientPage } from './CanvasClientPage';

interface CanvasPageProps {
  params: {
    slug: string;
    id: string;
  };
}

export default async function CanvasPage({ params }: CanvasPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      workspace: {
        include: {
          members: true,
        },
      },
      comments: {
        where: { parentId: null },
        include: {
          user: true,
          replies: {
            include: { user: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      snapshots: {
        include: {
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!document) {
    notFound();
  }

  const member = document.workspace.members.find((m) => m.userId === user.id);
  if (!member) {
    redirect('/login');
  }

  return (
    <CanvasClientPage
      document={{
        id: document.id,
        title: document.title,
        icon: document.icon,
        type: document.type as any,
        workspaceId: document.workspaceId,
      }}
      workspaceSlug={params.slug}
      currentUser={user}
      currentUserRole={member.role as any}
      initialComments={document.comments.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        userId: c.userId,
        user: {
          id: c.user.id,
          name: c.user.name,
          email: c.user.email,
          avatarUrl: c.user.avatarUrl,
          color: c.user.color,
        },
        content: c.content,
        selectionRange: c.selectionRange,
        resolved: c.resolved,
        createdAt: c.createdAt.toISOString(),
        replies: c.replies.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          userId: r.userId,
          user: {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            avatarUrl: r.user.avatarUrl,
            color: r.user.color,
          },
          content: r.content,
          resolved: r.resolved,
          createdAt: r.createdAt.toISOString(),
        })),
      }))}
      initialSnapshots={document.snapshots.map((s) => ({
        id: s.id,
        documentId: s.documentId,
        title: s.title,
        yjsState: s.yjsState,
        previewText: s.previewText,
        createdAt: s.createdAt.toISOString(),
        createdBy: s.createdBy
          ? {
              id: s.createdBy.id,
              name: s.createdBy.name,
              email: s.createdBy.email,
              color: s.createdBy.color,
            }
          : null,
      }))}
    />
  );
}
