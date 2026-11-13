import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkspaceShell } from './WorkspaceShell';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, color: true },
          },
        },
      },
      documents: {
        where: { isArchived: false },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (!workspace) {
    redirect('/login');
  }

  const currentMember = workspace.members.find((m) => m.userId === user.id);
  if (!currentMember) {
    // If not a member, check if invited or redirect
    redirect('/login');
  }

  return (
    <WorkspaceShell
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        icon: workspace.icon,
        currentUserRole: currentMember.role as any,
      }}
      initialDocuments={workspace.documents.map((d) => ({
        id: d.id,
        title: d.title,
        icon: d.icon,
        type: d.type as any,
        workspaceId: d.workspaceId,
        parentId: d.parentId,
        updatedAt: d.updatedAt.toISOString(),
        createdById: d.createdById,
        isArchived: d.isArchived,
      }))}
      currentUser={user}
    >
      {children}
    </WorkspaceShell>
  );
}
