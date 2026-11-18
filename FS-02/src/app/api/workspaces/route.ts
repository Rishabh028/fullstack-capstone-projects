import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));

    return NextResponse.json({ workspaces });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, icon } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        icon: icon || '📁',
        ownerId: user.id,
        members: {
          create: [{ userId: user.id, role: 'OWNER' }],
        },
      },
    });

    // Create default page
    await prisma.document.create({
      data: {
        title: 'Getting Started',
        icon: '🚀',
        type: 'DOCUMENT',
        workspaceId: workspace.id,
        createdById: user.id,
        content: '<h1>Getting Started</h1><p>Welcome to your new collaborative workspace.</p>',
      },
    });

    return NextResponse.json({ workspace });
  } catch (err: any) {
    console.error('Create workspace error:', err);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
