import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  CheckCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { isToday, isYesterday, parseISO } from 'date-fns';
import { useWorkspaceStore } from '@/store/workspaceStore';
import notificationsApi from '@/api/notifications';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { Notification } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceSlug = currentWorkspace?.slug || 'default';

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.issue) {
      navigate(`/${workspaceSlug}/issues/${n.issue}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
      case 'comment':
        return <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-indigo-500" />;
      case 'assignment':
        return <UserPlusIcon className="h-5 w-5 text-blue-500" />;
      case 'status_change':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-amber-500" />;
    }
  };

  // Group notifications by Today, Yesterday, Earlier
  const todayList: Notification[] = [];
  const yesterdayList: Notification[] = [];
  const earlierList: Notification[] = [];

  notifications.forEach((item) => {
    try {
      const d = parseISO(item.created_at);
      if (isToday(d)) {
        todayList.push(item);
      } else if (isYesterday(d)) {
        yesterdayList.push(item);
      } else {
        earlierList.push(item);
      }
    } catch {
      earlierList.push(item);
    }
  });

  const renderSection = (title: string, list: Notification[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
          {title}
        </h3>
        <div className="space-y-1.5">
          {list.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                n.is_read
                  ? 'bg-white border-gray-100 hover:border-gray-200'
                  : 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-300 shadow-xs'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-xl bg-white shadow-xs border border-gray-100">
                  {getNotificationIcon(n.notification_type)}
                </div>
                <div>
                  <p
                    className={`text-sm leading-snug ${
                      n.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'
                    }`}
                  >
                    {n.message}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <div
                  className="h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 shrink-0 ml-3"
                  title="Unread"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="mt-1 text-xs text-gray-500">
            Real-time updates on your assignments, mentions, and issue status changes.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          isLoading={markAllReadMutation.isPending}
          disabled={notifications.length === 0}
        >
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-6">
          {renderSection('Today', todayList)}
          {renderSection('Yesterday', yesterdayList)}
          {renderSection('Earlier', earlierList)}
        </div>
      ) : (
        <EmptyState
          icon={<BellIcon className="h-6 w-6" />}
          title="All caught up!"
          description="You don't have any notifications right now."
        />
      )}
    </div>
  );
};

export default NotificationsPage;
