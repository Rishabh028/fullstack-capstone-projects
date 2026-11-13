'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Circle,
  CornerDownRight,
  Send,
  X,
  Filter,
} from 'lucide-react';
import { CommentItem, UserSummary } from '@/types';
import { formatDate } from '@/lib/utils';

interface CommentsPanelProps {
  documentId: string;
  comments: CommentItem[];
  currentUser: UserSummary;
  initialSelection?: { from: number; to: number; text: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentCreated: (comment: CommentItem) => void;
  onCommentUpdated: (comment: CommentItem) => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  documentId,
  comments,
  currentUser,
  initialSelection,
  isOpen,
  onClose,
  onCommentCreated,
  onCommentUpdated,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newCommentText,
          selectionRange: initialSelection || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onCommentCreated(data.comment);
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText,
          parentId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update parent comment's replies locally
        const parent = comments.find((c) => c.id === parentId);
        if (parent) {
          const updatedParent = {
            ...parent,
            replies: [...(parent.replies || []), data.comment],
          };
          onCommentUpdated(updatedParent);
        }
        setReplyText('');
        setReplyingToId(null);
      }
    } catch (err) {
      console.error('Error replying:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleResolve = async (commentId: string, currentResolved: boolean) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          resolved: !currentResolved,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onCommentUpdated(data.comment);
      }
    } catch (err) {
      console.error('Error toggling resolve:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-84 md:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Comments</h3>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
            {comments.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800 gap-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            filter === 'open'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            filter === 'resolved'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Selected text quote if adding comment from selection */}
        {initialSelection && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-2.5 rounded text-xs text-amber-900 dark:text-amber-200">
            <span className="font-semibold block mb-0.5">Commenting on:</span>
            <span className="italic line-clamp-2">"{initialSelection.text}"</span>
          </div>
        )}

        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center text-xs">
            <MessageSquare className="w-8 h-8 mb-2 stroke-1 opacity-50" />
            <p>No comments found</p>
            <p className="mt-1">Leave feedback or mention team members below</p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            let selectionObj: any = null;
            try {
              if (comment.selectionRange) {
                selectionObj = JSON.parse(comment.selectionRange);
              }
            } catch (_) {}

            return (
              <div
                key={comment.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  comment.resolved
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: comment.user.color || '#6366f1' }}
                    >
                      {comment.user.name[0]}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {comment.user.name}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Resolve Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleResolve(comment.id, comment.resolved)}
                    className="text-slate-400 hover:text-emerald-600 transition-colors"
                    title={comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    {comment.resolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Selected Text Preview */}
                {selectionObj?.text && (
                  <div className="bg-slate-100 dark:bg-slate-900/60 border-l-2 border-indigo-500 px-2 py-1 mb-2 rounded text-[11px] text-slate-600 dark:text-slate-300 italic">
                    "{selectionObj.text}"
                  </div>
                )}

                {/* Content */}
                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>

                {/* Thread Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 space-y-2 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex flex-col text-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: reply.user.color || '#6366f1' }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px]">
                            {reply.user.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 pl-3">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <div className="mt-3 pt-2 flex items-center gap-2">
                  {replyingToId === comment.id ? (
                    <div className="w-full flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateReply(comment.id);
                        }}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateReply(comment.id)}
                        className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyingToId(comment.id)}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Top-Level Comment Input */}
      <form onSubmit={handleCreateComment} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || submitting}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
