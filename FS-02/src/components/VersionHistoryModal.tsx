'use client';

import React, { useState } from 'react';
import * as Y from 'yjs';
import { History, Clock, RotateCcw, Plus, X, Check, AlertCircle } from 'lucide-react';
import { SnapshotItem, UserSummary } from '@/types';
import { formatDate } from '@/lib/utils';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  ydoc: Y.Doc | null;
  snapshots: SnapshotItem[];
  currentUser: UserSummary;
  isReadOnly?: boolean;
  onSnapshotCreated: (snapshot: SnapshotItem) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  documentId,
  ydoc,
  snapshots,
  currentUser,
  isReadOnly = false,
  onSnapshotCreated,
}) => {
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ydoc || isCreating) return;

    try {
      setIsCreating(true);
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64 = Buffer.from(state).toString('base64');

      const res = await fetch(`/api/documents/${documentId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: snapshotTitle.trim() || `Snapshot at ${new Date().toLocaleTimeString()}`,
          yjsState: base64,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSnapshotCreated(data.snapshot);
        setSnapshotTitle('');
      }
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreSnapshot = async (snapshot: SnapshotItem) => {
    if (!ydoc || isReadOnly) return;

    try {
      setRestoringId(snapshot.id);
      const update = Buffer.from(snapshot.yjsState, 'base64');

      // Apply the historical snapshot update to the active Yjs CRDT Document
      Y.applyUpdate(ydoc, update);

      setRestoreSuccess(true);
      setTimeout(() => {
        setRestoreSuccess(false);
        setRestoringId(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Version History & Snapshots
              </h3>
              <p className="text-xs text-slate-500">
                View point-in-time snapshots or roll back changes using CRDT states.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Snapshot Form */}
        {!isReadOnly && (
          <form
            onSubmit={handleCreateSnapshot}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Name this version (e.g., 'Before refactoring', 'Release v1.2')..."
              value={snapshotTitle}
              onChange={(e) => setSnapshotTitle(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Saving...' : 'Take Snapshot'}</span>
            </button>
          </form>
        )}

        {/* Snapshots Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {restoreSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs font-semibold animate-pulse">
              <Check className="w-4 h-4" />
              <span>Document restored successfully to snapshot!</span>
            </div>
          )}

          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p>No snapshots captured yet.</p>
              <p className="mt-1">Click "Take Snapshot" above to preserve a version.</p>
            </div>
          ) : (
            snapshots.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800/60 transition-all shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {s.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(s.createdAt)}</span>
                      {s.createdBy && (
                        <>
                          <span>•</span>
                          <span>By {s.createdBy.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <button
                    type="button"
                    disabled={restoringId === s.id}
                    onClick={() => handleRestoreSnapshot(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{restoringId === s.id ? 'Restoring...' : 'Restore'}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
