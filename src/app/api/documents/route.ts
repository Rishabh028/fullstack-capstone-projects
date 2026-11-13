import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, title, icon, type = 'DOCUMENT', parentId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Check membership and role
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!member || member.role === 'VIEWER') {
      return NextResponse.json({ error: 'You do not have permission to create documents in this workspace' }, { status: 403 });
    }

    const document = await prisma.document.create({
      data: {
        title: title || (type === 'CANVAS' ? 'Untitled Canvas' : 'Untitled Document'),
        icon: icon || (type === 'CANVAS' ? '🎨' : '📄'),
        type: type,
        workspaceId,
        parentId: parentId || null,
        createdById: user.id,
        content: '',
      },
    });

    return NextResponse.json({ document });
  } catch (err: any) {
    console.error('Create document error:', err);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
