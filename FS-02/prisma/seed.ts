import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as Y from 'yjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.snapshot.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Demo Users
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Walker',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      color: '#6366f1', // Indigo
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Chen',
      email: 'bob@example.com',
      passwordHash: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      color: '#10b981', // Emerald
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      passwordHash: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      color: '#f59e0b', // Amber
    },
  });

  const diana = await prisma.user.create({
    data: {
      name: 'Diana Prince (Viewer)',
      email: 'diana@example.com',
      passwordHash: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      color: '#ec4899', // Pink
    },
  });

  console.log('✅ Created 4 demo users: Alice (Owner), Bob (Editor), Charlie (Editor), Diana (Viewer)');

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Notion & Figma Hub',
      slug: 'notion-figma-hub',
      icon: '🚀',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'ADMIN' },
          { userId: charlie.id, role: 'EDITOR' },
          { userId: diana.id, role: 'VIEWER' },
        ],
      },
    },
  });

  console.log('✅ Created workspace:', workspace.name);

  // 3. Create Default Welcome Document
  const welcomeDocYjs = new Y.Doc();
  const yText = welcomeDocYjs.getText('default');
  yText.insert(0, '# Welcome to Real-Time Collaborative Workspace\n\nExperience seamless real-time CRDT collaboration like Notion and Figma.');
  const initialYjsState = Buffer.from(Y.encodeStateAsUpdate(welcomeDocYjs)).toString('base64');

  const welcomeDoc = await prisma.document.create({
    data: {
      id: 'welcome-guide',
      title: '👋 Welcome & Quickstart Guide',
      icon: '✨',
      type: 'DOCUMENT',
      workspaceId: workspace.id,
      createdById: alice.id,
      content: '<h1>👋 Welcome to Real-Time Collaborative Workspace</h1><p>Edit concurrently with your team without merge conflicts.</p>',
      yjsState: initialYjsState,
    },
  });

  // 4. Create Collaborative Canvas Document
  const canvasDocYjs = new Y.Doc();
  const yElements = canvasDocYjs.getArray('canvas-elements');
  yElements.push([
    {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 120,
      width: 200,
      height: 120,
      fill: '#e0e7ff',
      stroke: '#4338ca',
      text: 'Client (TipTap & Canvas)',
    },
    {
      id: 'rect-2',
      type: 'rectangle',
      x: 420,
      y: 120,
      width: 220,
      height: 120,
      fill: '#dcfce7',
      stroke: '#15803d',
      text: 'WebSocket (y-websocket)',
    },
    {
      id: 'rect-3',
      type: 'rectangle',
      x: 740,
      y: 120,
      width: 200,
      height: 120,
      fill: '#fef3c7',
      stroke: '#b45309',
      text: 'Redis Pub/Sub Cluster',
    },
    {
      id: 'sticky-1',
      type: 'sticky',
      x: 120,
      y: 300,
      width: 180,
      height: 160,
      fill: '#fef08a',
      stroke: '#ca8a04',
      text: '💡 Tip: Open two browser windows side by side to watch your cursors dance in real-time!',
    },
  ]);
  const canvasYjsState = Buffer.from(Y.encodeStateAsUpdate(canvasDocYjs)).toString('base64');

  const canvasDoc = await prisma.document.create({
    data: {
      id: 'system-architecture-canvas',
      title: '🎨 System Architecture Whiteboard',
      icon: '🎨',
      type: 'CANVAS',
      workspaceId: workspace.id,
      createdById: alice.id,
      content: 'Collaborative Figma-style Canvas with multi-user cursors and shapes',
      yjsState: canvasYjsState,
    },
  });

  // 5. Create Nested Document
  const roadmapDoc = await prisma.document.create({
    data: {
      id: 'product-roadmap-2027',
      title: '🗺️ Engineering Roadmap 2027',
      icon: '🎯',
      type: 'DOCUMENT',
      workspaceId: workspace.id,
      parentId: welcomeDoc.id,
      createdById: bob.id,
      content: '<h1>Engineering Roadmap 2027</h1><p>Key architectural milestones and CRDT optimizations.</p>',
    },
  });

  // 6. Create Initial Comments
  await prisma.comment.create({
    data: {
      documentId: welcomeDoc.id,
      userId: bob.id,
      content: 'The real-time Yjs sync latency is sub-15 milliseconds! Remarkable performance.',
      selectionRange: JSON.stringify({ from: 10, to: 45, text: 'Real-Time Collaborative Workspace' }),
      resolved: false,
      replies: {
        create: [
          {
            documentId: welcomeDoc.id,
            userId: alice.id,
            content: 'Agreed! And Redis Pub/Sub synchronizes between multiple instances effortlessly.',
          },
        ],
      },
    },
  });

  // 7. Create Initial Version Snapshot
  await prisma.snapshot.create({
    data: {
      documentId: welcomeDoc.id,
      title: 'Initial v1.0 Baseline',
      yjsState: initialYjsState,
      previewText: 'Welcome to Real-Time Collaborative Workspace...',
      createdById: alice.id,
    },
  });

  console.log('✅ Seed completed successfully with documents, canvas, comments, and snapshots!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
