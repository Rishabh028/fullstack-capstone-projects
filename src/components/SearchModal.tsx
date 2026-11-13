'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Palette, CornerDownLeft, X } from 'lucide-react';
import { DocumentItem } from '@/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  documents: DocumentItem[];
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  workspaceSlug,
  documents,
}) => {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Handled by parent toggle
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (doc: DocumentItem) => {
    onClose();
    if (doc.type === 'CANVAS') {
      router.push(`/workspace/${workspaceSlug}/canvas/${doc.id}`);
    } else {
      router.push(`/workspace/${workspaceSlug}/doc/${doc.id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search pages, whiteboards, docs... (or type Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching pages or documents found for "{query}"
            </div>
          ) : (
            filtered.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleSelect(doc)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{doc.icon || (doc.type === 'CANVAS' ? '🎨' : '📄')}</span>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {doc.type}
                    </span>
                  </div>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
