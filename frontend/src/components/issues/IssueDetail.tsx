import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  TrashIcon,
  PaperClipIcon,
  ChatBubbleLeftEllipsisIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowUturnLeftIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Issue, IssueStatus, IssueType, Priority, User, Comment, Attachment, AuditLog } from '@/types';
import issuesApi, { UpdateIssuePayload } from '@/api/issues';
import commentsApi from '@/api/comments';
import attachmentsApi from '@/api/attachments';
import auditLogApi from '@/api/auditLog';
import workspacesApi from '@/api/workspaces';
import sprintsApi from '@/api/sprints';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDate, formatRelativeTime, formatFileSize, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface IssueDetailProps {
  issueId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: Issue) => void;
  onDeleted?: (deletedId: number) => void;
}

export const IssueDetail: React.FC<IssueDetailProps> = ({
  issueId,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'description' | 'comments' | 'attachments' | 'history'>('description');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Local editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // New comment input
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Fetch Issue Details
  const {
    data: issue,
    isLoading: isIssueLoading,
    refetch: refetchIssue,
  } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => issuesApi.getIssue(issueId!),
    enabled: isOpen && !!issueId,
  });

  // Fetch Workspace Members for Assignee Picker
  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.slug],
    queryFn: () => workspacesApi.getMembers(currentWorkspace!.slug),
    enabled: isOpen && !!currentWorkspace?.slug,
  });

  // Fetch Sprints for Sprint Picker
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', issue?.project],
    queryFn: () => sprintsApi.getSprints(issue!.project),
    enabled: isOpen && !!issue?.project,
  });

  // Fetch Comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', issueId],
    queryFn: () => commentsApi.getComments(issueId!),
    enabled: isOpen && !!issueId,
  });

  // Fetch Attachments
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['attachments', issueId],
    queryFn: () => attachmentsApi.getAttachments(issueId!),
    enabled: isOpen && !!issueId,
  });

  // Fetch Audit Logs (History)
  const { data: auditLogsData } = useQuery({
    queryKey: ['audit-logs', currentWorkspace?.slug, issueId],
    queryFn: () =>
      auditLogApi.getAuditLog(currentWorkspace!.slug, {
        limit: 50,
      }),
    enabled: isOpen && !!currentWorkspace?.slug && activeTab === 'history',
  });

  const auditLogs = auditLogsData?.results || [];

  // Initialize title and description when issue loads
  useEffect(() => {
    if (issue) {
      setTitle(issue.title || '');
      setDescription(issue.description || '');
    }
  }, [issue]);

  // Patch mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateIssuePayload) => issuesApi.updateIssue(issueId!, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.setQueryData(['issue', issueId], updated);
      if (onUpdated) onUpdated(updated);
    },
    onError: () => {
      toast.error('Failed to update issue');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => issuesApi.deleteIssue(issueId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue deleted');
      setDeleteConfirmOpen(false);
      onClose();
      if (onDeleted && issueId) onDeleted(issueId);
    },
    onError: () => {
      toast.error('Failed to delete issue');
    },
  });

  // Debounced auto-save for description
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (issue && val !== issue.description) {
        updateMutation.mutate({ description: val });
      }
    }, 500);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (issue && title.trim() && title !== issue.title) {
      updateMutation.mutate({ title: title.trim() });
    }
  };

  const handleFieldChange = (field: keyof UpdateIssuePayload, value: any) => {
    updateMutation.mutate({ [field]: value });
  };

  // Add Comment
  const addCommentMutation = useMutation({
    mutationFn: ({ content, parent }: { content: string; parent?: number | null }) =>
      commentsApi.createComment(issueId!, content, parent),
    onSuccess: () => {
      refetchComments();
      refetchIssue();
      setCommentText('');
      setReplyingToId(null);
      setReplyText('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  // Delete Comment
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => commentsApi.deleteComment(commentId),
    onSuccess: () => {
      refetchComments();
      refetchIssue();
      toast.success('Comment removed');
    },
  });

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.uploadAttachment(issueId!, file),
    onSuccess: () => {
      refetchAttachments();
      refetchIssue();
      toast.success('File uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAttachmentMutation.mutate(file);
      e.target.value = '';
    }
  };

  // Delete Attachment
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => attachmentsApi.deleteAttachment(attachmentId),
    onSuccess: () => {
      refetchAttachments();
      refetchIssue();
      toast.success('Attachment deleted');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-[640px] transform bg-white shadow-2xl transition-all duration-300 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-semibold text-indigo-600">
                #{issue?.sequence_number || issueId}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500 capitalize">
                Created {formatRelativeTime(issue?.created_at)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete Issue"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {isIssueLoading || !issue ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Editable Title */}
              <div>
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    autoFocus
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleBlur();
                    }}
                    className="w-full text-xl font-bold text-gray-900 border-b-2 border-indigo-600 pb-1 focus:outline-none"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl font-bold text-gray-900 hover:bg-gray-100/70 p-1 -m-1 rounded-md cursor-pointer transition-colors"
                    title="Click to edit title"
                  >
                    {issue.title}
                  </h2>
                )}
              </div>

              {/* Status, Priority, Type Quick Select Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {/* Status */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Status
                  </span>
                  <select
                    value={issue.status}
                    onChange={(e) => handleFieldChange('status', e.target.value as IssueStatus)}
                    className="w-full text-xs font-semibold rounded-lg border-gray-200 bg-white py-1.5 px-2 text-gray-800 shadow-xs focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Priority
                  </span>
                  <select
                    value={issue.priority}
                    onChange={(e) => handleFieldChange('priority', e.target.value as Priority)}
                    className="w-full text-xs font-semibold rounded-lg border-gray-200 bg-white py-1.5 px-2 text-gray-800 shadow-xs focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="highest">Highest</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="lowest">Lowest</option>
                  </select>
                </div>

                {/* Type */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Type
                  </span>
                  <select
                    value={issue.issue_type}
                    onChange={(e) => handleFieldChange('issue_type', e.target.value as IssueType)}
                    className="w-full text-xs font-semibold rounded-lg border-gray-200 bg-white py-1.5 px-2 text-gray-800 shadow-xs focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                    <option value="story">Story</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>
              </div>

              {/* Metadata Fields: Assignee, Reporter, Sprint, Points, Due Date */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Assignee */}
                <div>
                  <label className="text-gray-500 font-medium block mb-1">Assignee</label>
                  <select
                    value={issue.assignee?.id || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'assignee',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full rounded-lg border-gray-300 py-1.5 px-2 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.first_name} {m.user.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reporter (Read only) */}
                <div>
                  <label className="text-gray-500 font-medium block mb-1">Reporter</label>
                  <div className="flex items-center space-x-2 py-1.5 px-2 bg-gray-50 rounded-lg text-gray-700">
                    <Avatar user={issue.reporter} size="xs" />
                    <span className="truncate">
                      {issue.reporter?.first_name} {issue.reporter?.last_name}
                    </span>
                  </div>
                </div>

                {/* Sprint */}
                <div>
                  <label className="text-gray-500 font-medium block mb-1">Sprint</label>
                  <select
                    value={issue.sprint || ''}
                    onChange={(e) =>
                      handleFieldChange('sprint', e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-lg border-gray-300 py-1.5 px-2 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">No sprint (Backlog)</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Story Points */}
                <div>
                  <label className="text-gray-500 font-medium block mb-1">Story Points</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={issue.story_points ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'story_points',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 3"
                    className="w-full rounded-lg border-gray-300 py-1.5 px-2 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Due Date */}
                <div className="col-span-2">
                  <label className="text-gray-500 font-medium block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={issue.due_date ? issue.due_date.split('T')[0] : ''}
                    onChange={(e) =>
                      handleFieldChange('due_date', e.target.value || null)
                    }
                    className="w-full rounded-lg border-gray-300 py-1.5 px-2 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tabs: Description | Comments | Attachments | History */}
              <div className="pt-2">
                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('description')}
                    className={cn(
                      'py-2 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5',
                      activeTab === 'description'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    <span>Description</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      'py-2 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5',
                      activeTab === 'comments'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                    <span>Comments ({comments.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('attachments')}
                    className={cn(
                      'py-2 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5',
                      activeTab === 'attachments'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <PaperClipIcon className="h-4 w-4" />
                    <span>Attachments ({attachments.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={cn(
                      'py-2 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5',
                      activeTab === 'history'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <ClockIcon className="h-4 w-4" />
                    <span>Activity</span>
                  </button>
                </div>

                {/* Tab 1: Description (auto-resize textarea) */}
                {activeTab === 'description' && (
                  <div className="py-4 space-y-2">
                    <textarea
                      rows={6}
                      value={description}
                      onChange={handleDescriptionChange}
                      placeholder="Add a detailed description... Changes save automatically."
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                    />
                    {updateMutation.isPending && (
                      <p className="text-[11px] text-gray-400 flex items-center space-x-1">
                        <Spinner size="xs" />
                        <span>Saving changes...</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Tab 2: Comments */}
                {activeTab === 'comments' && (
                  <div className="py-4 space-y-4">
                    {/* Add comment input */}
                    <div className="flex space-x-2.5">
                      <Avatar user={currentUser} size="sm" />
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={2}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={!commentText.trim() || addCommentMutation.isPending}
                            isLoading={addCommentMutation.isPending}
                            onClick={() => addCommentMutation.mutate({ content: commentText })}
                          >
                            Comment
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Comments list */}
                    <div className="space-y-3 pt-2">
                      {comments.map((comment: Comment) => (
                        <div
                          key={comment.id}
                          className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Avatar user={comment.author} size="xs" />
                              <span className="font-semibold text-gray-900">
                                {comment.author?.first_name} {comment.author?.last_name}
                              </span>
                              <span className="text-gray-400">
                                {formatRelativeTime(comment.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => setReplyingToId(comment.id)}
                                className="text-gray-400 hover:text-indigo-600 p-1"
                                title="Reply"
                              >
                                <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                              </button>
                              {currentUser?.id === comment.author?.id && (
                                <button
                                  type="button"
                                  onClick={() => deleteCommentMutation.mutate(comment.id)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>

                          {/* Nested replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="pl-4 border-l-2 border-indigo-200 space-y-2 mt-2">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="pt-1">
                                  <div className="flex items-center space-x-2">
                                    <Avatar user={reply.author} size="xs" />
                                    <span className="font-semibold text-gray-800">
                                      {reply.author?.first_name} {reply.author?.last_name}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      {formatRelativeTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 mt-1">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Reply input */}
                          {replyingToId === comment.id && (
                            <div className="mt-2 pt-2 border-t border-gray-200 flex space-x-2">
                              <input
                                type="text"
                                autoFocus
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Reply..."
                                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                              />
                              <Button
                                size="sm"
                                disabled={!replyText.trim()}
                                onClick={() =>
                                  addCommentMutation.mutate({
                                    content: replyText,
                                    parent: comment.id,
                                  })
                                }
                              >
                                Reply
                              </Button>
                              <button
                                type="button"
                                onClick={() => setReplyingToId(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {comments.length === 0 && (
                        <p className="text-center py-6 text-gray-400 text-xs">
                          No comments yet. Start the conversation!
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Attachments */}
                {activeTab === 'attachments' && (
                  <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Files</span>
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => fileInputRef.current?.click()}
                          isLoading={uploadAttachmentMutation.isPending}
                          leftIcon={<PaperClipIcon className="h-4 w-4" />}
                        >
                          Upload File
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {attachments.map((file: Attachment) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs transition-colors"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <PaperClipIcon className="h-4 w-4 text-gray-400 shrink-0" />
                            <a
                              href={file.file}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-indigo-600 hover:underline truncate"
                            >
                              {file.filename}
                            </a>
                            <span className="text-gray-400">({formatFileSize(file.file_size)})</span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 ml-2">
                            <a
                              href={file.file}
                              download={file.filename}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => deleteAttachmentMutation.mutate(file.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {attachments.length === 0 && (
                        <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                          No attachments uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: History / Audit Log */}
                {activeTab === 'history' && (
                  <div className="py-4 space-y-3">
                    {auditLogs.map((log: AuditLog) => (
                      <div
                        key={log.id}
                        className="flex items-start space-x-2.5 text-xs text-gray-600 py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <Avatar user={log.user} size="xs" />
                        <div className="flex-1">
                          <p>
                            <span className="font-semibold text-gray-900">
                              {log.user?.first_name} {log.user?.last_name}
                            </span>{' '}
                            <span>{log.action}</span>
                            {log.field_name && (
                              <span className="font-medium text-gray-700"> {log.field_name}</span>
                            )}
                          </p>
                          {log.old_value && log.new_value && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Changed from <span className="line-through">{log.old_value}</span> to{' '}
                              <span className="font-medium text-gray-700">{log.new_value}</span>
                            </p>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {auditLogs.length === 0 && (
                      <p className="text-center py-6 text-xs text-gray-400">No activity recorded</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Issue"
        message="Are you sure you want to delete this issue? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default IssueDetail;
