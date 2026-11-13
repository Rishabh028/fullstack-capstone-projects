import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { getRandomColor } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const color = getRandomColor(email);

    // Create user and a default workspace
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        color,
      },
    });

    const workspaceSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace-${Math.random().toString(36).substring(2, 6)}`;
    const workspace = await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug: workspaceSlug,
        icon: '🚀',
        ownerId: user.id,
        members: {
          create: [{ userId: user.id, role: 'OWNER' }],
        },
      },
    });

    // Create a starter document
    await prisma.document.create({
      data: {
        title: '👋 Welcome to your new workspace',
        icon: '📝',
        type: 'DOCUMENT',
        workspaceId: workspace.id,
        createdById: user.id,
        content: '<h1>Welcome to your workspace</h1><p>Start typing or invite team members to collaborate simultaneously.</p>',
      },
    });

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      color: user.color,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
      },
      workspaceSlug: workspace.slug,
    });

    response.cookies.set('collab_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
