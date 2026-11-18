'use client';

import React, { useState } from 'react';
import {
  History,
  MessageSquare,
  Share2,
  Download,
  MoreHorizontal,
  FileDown,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { PresenceBar } from './PresenceBar';
import { UserSummary, Role } from '@/types';

interface NavbarProps {
  documentId: string;
  title: string;
  icon?: string | null;
  type: 'DOCUMENT' | 'CANVAS';
  collaborators: Array<{
    clientId: number;
    user: {
      name: string;
      color: string;
      avatar?: string | null;
      email?: string;
    };
  }>;
  commentsCount: number;
  currentUserRole?: Role;
  onUpdateTitle: (title: string) => void;
  onUpdateIcon: (icon: string) => void;
  onOpenComments: () => void;
  onOpenHistory: () => void;
  onOpenShare: () => void;
  isReadOnly?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  documentId,
  title,
  icon,
  type,
  collaborators,
  commentsCount,
  currentUserRole = 'EDITOR',
  onUpdateTitle,
  onUpdateIcon,
  onOpenComments,
  onOpenHistory,
  onOpenShare,
  isReadOnly = false,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (currentTitle.trim() && currentTitle !== title) {
      onUpdateTitle(currentTitle.trim());
    }
  };

  const handleExport = (format: 'markdown' | 'print') => {
    setShowExportMenu(false);
    if (format === 'print') {
      window.print();
    } else if (format === 'markdown') {
      const editorElement = document.querySelector('.ProseMirror');
      const text = editorElement ? (editorElement as HTMLElement).innerText : title;
      const blob = new Blob([`# ${title}\n\n${text}`], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Title & Icon */}
      <div className="flex items-center gap-2 truncate max-w-md">
        <span className="text-xl shrink-0 cursor-pointer">{icon || (type === 'CANVAS' ? '🎨' : '📄')}</span>
        {editingTitle && !isReadOnly ? (
          <input
            type="text"
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
            }}
            className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b-2 border-indigo-500 outline-none px-1"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => !isReadOnly && setEditingTitle(true)}
            className={`text-sm font-bold text-slate-800 dark:text-slate-100 truncate ${
              !isReadOnly ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded transition-colors' : ''
            }`}
            title={!isReadOnly ? 'Click to rename' : undefined}
          >
            {title}
          </h1>
        )}

        {isReadOnly && (
          <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            View Only
          </span>
        )}
      </div>

      {/* Right Controls: Presence, Comments, Version History, Share, Export */}
      <div className="flex items-center gap-2">
        {/* Presence Avatars */}
        <PresenceBar collaborators={collaborators} />

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

        {/* Comments Toggle */}
        <button
          type="button"
          onClick={onOpenComments}
          className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Comments"
        >
          <MessageSquare className="w-4 h-4" />
          {commentsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {commentsCount}
            </span>
          )}
        </button>

        {/* Version History */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Version History & Snapshots"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Share & Permissions */}
        <button
          type="button"
          onClick={onOpenShare}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Export / More */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Export Options"
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => handleExport('markdown')}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('print')}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
