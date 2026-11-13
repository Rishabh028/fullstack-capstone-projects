import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
          select: {
            id: true,
            title: true,
            icon: true,
            type: true,
            workspaceId: true,
            parentId: true,
            updatedAt: true,
            createdById: true,
            isArchived: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check membership
    const member = workspace.members.find((m) => m.userId === user.id);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      workspace: {
        ...workspace,
        currentUserRole: member.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
  }
}
