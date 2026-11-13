import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const comments = await prisma.comment.findMany({
      where: {
        documentId: params.id,
        parentId: null, // top-level threads
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, color: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, color: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comments });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, selectionRange, parentId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        documentId: params.id,
        userId: user.id,
        content: content.trim(),
        selectionRange: selectionRange ? JSON.stringify(selectionRange) : null,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, color: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ comment });
  } catch (err: any) {
    console.error('Create comment error:', err);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId, resolved } = await req.json();

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { resolved: !!resolved },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, color: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ comment });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}
