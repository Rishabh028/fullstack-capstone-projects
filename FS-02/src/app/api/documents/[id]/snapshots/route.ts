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

    const snapshots = await prisma.snapshot.findMany({
      where: { documentId: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ snapshots });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
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

    const { title, yjsState, previewText } = await req.json();

    if (!yjsState) {
      return NextResponse.json({ error: 'Snapshot data is required' }, { status: 400 });
    }

    const snapshot = await prisma.snapshot.create({
      data: {
        documentId: params.id,
        title: title || `Version snapshot (${new Date().toLocaleTimeString()})`,
        yjsState,
        previewText: previewText || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, color: true },
        },
      },
    });

    return NextResponse.json({ snapshot });
  } catch (err: any) {
    console.error('Create snapshot error:', err);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
