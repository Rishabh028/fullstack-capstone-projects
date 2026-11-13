'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  MessageSquarePlus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { UserSummary } from '@/types';

interface CollaborativeEditorProps {
  documentId: string;
  currentUser: UserSummary;
  isReadOnly?: boolean;
  onOpenCommentModal?: (range: { from: number; to: number; text: string }) => void;
  onCollaboratorsChange?: (collaborators: any[]) => void;
  onDocChange?: (doc: Y.Doc) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  currentUser,
  isReadOnly = false,
  onOpenCommentModal,
  onCollaboratorsChange,
  onDocChange,
}) => {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number; text: string } | null>(null);

  // Initialize Yjs Document and WebSocket Provider
  useEffect(() => {
    const doc = new Y.Doc();
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234';
    const wsProvider = new WebsocketProvider(wsUrl, documentId, doc);

    wsProvider.awareness.setLocalStateField('user', {
      name: currentUser.name,
      color: currentUser.color || '#6366f1',
      avatar: currentUser.avatarUrl,
    });

    wsProvider.on('status', (event: { status: string }) => {
      setConnected(event.status === 'connected');
    });

    const handleAwarenessUpdate = () => {
      const states = wsProvider.awareness.getStates();
      const collabs: any[] = [];
      states.forEach((state, clientId) => {
        if (state.user) {
          collabs.push({ clientId, user: state.user });
        }
      });
      if (onCollaboratorsChange) {
        onCollaboratorsChange(collabs);
      }
    };

    wsProvider.awareness.on('change', handleAwarenessUpdate);

    setYdoc(doc);
    setProvider(wsProvider);
    if (onDocChange) onDocChange(doc);

    return () => {
      wsProvider.awareness.off('change', handleAwarenessUpdate);
      wsProvider.destroy();
      doc.destroy();
    };
  }, [documentId, currentUser]);

  const editor = useEditor(
    {
      editable: !isReadOnly,
      extensions: [
        StarterKit.configure({
          history: false, // History handled by Yjs CRDT
        }),
        Placeholder.configure({
          placeholder: isReadOnly
            ? 'This document is view-only.'
            : 'Type something, press "/" for commands, or collaborate in real-time...',
        }),
        Underline,
        Highlight.configure({ multicolor: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        ...(ydoc && provider
          ? [
              Collaboration.configure({
                document: ydoc,
              }),
              CollaborationCursor.configure({
                provider: provider,
                user: {
                  name: currentUser.name,
                  color: currentUser.color || '#6366f1',
                },
              }),
            ]
          : []),
      ],
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          if (text.trim().length > 0) {
            setSelectionRange({ from, to, text });
            return;
          }
        }
        setSelectionRange(null);
      },
    },
    [ydoc, provider, isReadOnly]
  );

  if (!editor || !ydoc || !provider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Connecting to real-time CRDT session...</p>
      </div>
    );
  }

  const handleAddCommentFromSelection = () => {
    if (selectionRange && onOpenCommentModal) {
      onOpenCommentModal(selectionRange);
      setSelectionRange(null);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Editor Top Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        {/* Formatting Actions */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600 font-bold' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('code') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Headings */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Lists & Blocks */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('taskList') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              editor.isActive('blockquote') ? 'bg-slate-200 dark:bg-slate-700 text-indigo-600' : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>

          {/* Table */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Connection Status */}
        <div className="flex items-center gap-2">
          {selectionRange && onOpenCommentModal && (
            <button
              type="button"
              onClick={handleAddCommentFromSelection}
              className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-medium px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 transition-all shadow-sm animate-pulse"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Comment on selection</span>
            </button>
          )}

          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              connected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            }`}
          >
            {connected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>Live Synced</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-600 animate-pulse" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="p-8 min-h-[500px] cursor-text">
        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none focus:outline-none" />
      </div>
    </div>
  );
};
