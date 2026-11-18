import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '@/store/workspaceStore';
import auditLogApi from '@/api/auditLog';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { AuditLog } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

export const AuditLogPage: React.FC = () => {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { currentWorkspace } = useWorkspaceStore();
  const activeSlug = currentWorkspace?.slug || workspaceSlug || 'default';

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data: logData, isLoading } = useQuery({
    queryKey: ['audit-logs', activeSlug, page, actionFilter],
    queryFn: () =>
      auditLogApi.getAuditLog(activeSlug, {
        action: actionFilter || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: !!activeSlug,
  });

  const logs = logData?.results || [];
  const totalCount = logData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('No logs available to export');
      return;
    }
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(logs, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `audit-logs-${activeSlug}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Audit log export downloaded');
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Audit Trail</h1>
          <p className="mt-1 text-xs text-gray-500">
            Immutable security log of changes, updates, and user actions in this workspace.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
        >
          Export Logs
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <FunnelIcon className="h-4 w-4 text-gray-400" />
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 py-1.5 px-3 text-xs text-gray-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="status_changed">Status Changed</option>
          <option value="moved">Moved</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          Showing {logs.length} of {totalCount} records
        </span>
      </div>

      {/* Logs Table */}
      <Card bodyClassName="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead className="bg-gray-50/70 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Field Changed</th>
                  <th className="py-3 px-4">Change Delta</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {logs.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <Avatar user={log.user} size="xs" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {log.user?.first_name} {log.user?.last_name}
                          </p>
                          <p className="text-[10px] text-gray-400">{log.user?.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700 capitalize">
                        {log.action}
                      </span>
                    </td>

                    {/* Field Changed */}
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      {log.field_name || '—'}
                    </td>

                    {/* Change Delta */}
                    <td className="py-3 px-4">
                      {log.old_value || log.new_value ? (
                        <div className="text-[11px]">
                          {log.old_value && (
                            <span className="text-red-500 line-through mr-1.5 font-mono">
                              {log.old_value}
                            </span>
                          )}
                          {log.new_value && (
                            <span className="text-emerald-600 font-semibold font-mono">
                              {log.new_value}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-right text-gray-400 whitespace-nowrap">
                      <span title={log.created_at}>{formatRelativeTime(log.created_at)}</span>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                      No audit logs match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogPage;
