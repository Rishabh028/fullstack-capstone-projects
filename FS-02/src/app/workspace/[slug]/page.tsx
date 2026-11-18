import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  FileText,
  Palette,
  Sparkles,
  Users,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await getCurrentUser();

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      documents: {
        where: { isArchived: false },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      },
    },
  });

  if (!workspace) return null;

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8 select-none">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Notion + Figma Real-Time CRDT Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome to {workspace.name}
          </h1>
          <p className="text-sm text-indigo-100 leading-relaxed">
            Collaborate in real-time with zero merge conflicts. Edit docs, sketch whiteboards, inspect point-in-time snapshots, and communicate with your team simultaneously.
          </p>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Quick Launch Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href={`/workspace/${workspace.slug}/doc/${workspace.documents[0]?.id || ''}`}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-xs hover:shadow-md group flex items-start gap-4"
        >
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Rich-Text Documents</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              TipTap block editor with live multi-user cursors, headings, task lists, code formatting, and tables.
            </p>
          </div>
        </Link>

        <Link
          href={`/workspace/${workspace.slug}/canvas/${workspace.documents.find((d) => d.type === 'CANVAS')?.id || ''}`}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-xs hover:shadow-md group flex items-start gap-4"
        >
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
            <Palette className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Whiteboard Canvases</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Figma-style collaborative canvas with synchronized shapes, sticky notes, and live pointer tracking.
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Pages */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Recent Workspace Pages</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {workspace.documents.map((doc) => (
            <Link
              key={doc.id}
              href={
                doc.type === 'CANVAS'
                  ? `/workspace/${workspace.slug}/canvas/${doc.id}`
                  : `/workspace/${workspace.slug}/doc/${doc.id}`
              }
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition-all group flex flex-col justify-between h-32"
            >
              <div>
                <span className="text-2xl mb-2 block">{doc.icon || (doc.type === 'CANVAS' ? '🎨' : '📄')}</span>
                <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 truncate transition-colors">
                  {doc.title}
                </h3>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {doc.type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(doc.updatedAt)}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Team & Members */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xs">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
              Workspace Team ({workspace.members.length} members)
            </h4>
            <p className="text-[11px] text-slate-500">
              Test with multiple browser tabs to simulate concurrent collaborators
            </p>
          </div>
        </div>

        <div className="flex items-center -space-x-2">
          {workspace.members.map((m) => (
            <div
              key={m.id}
              className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-2xs"
              style={{ backgroundColor: m.user.color || '#6366f1' }}
              title={`${m.user.name} (${m.role})`}
            >
              {m.user.name[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
