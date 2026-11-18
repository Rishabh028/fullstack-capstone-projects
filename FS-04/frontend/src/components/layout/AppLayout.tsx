import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HomeIcon,
  FolderIcon,
  ViewColumnsIcon,
  QueueListIcon,
  BellIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import workspacesApi from '@/api/workspaces';
import projectsApi from '@/api/projects';
import notificationsApi from '@/api/notifications';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import CreateIssueModal from '@/components/issues/CreateIssueModal';
import Modal from '@/components/ui/Modal';
import issuesApi from '@/api/issues';
import { cn } from '@/lib/utils';
import { Issue } from '@/types';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug?: string; projectKey?: string }>();
  const { user, logout } = useAuthStore();
  const { currentWorkspace, setCurrentWorkspace, currentProject, setCurrentProject } =
    useWorkspaceStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch workspaces to ensure currentWorkspace is loaded
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.getWorkspaces,
  });

  // Keep currentWorkspace in sync with URL or workspaces list
  useEffect(() => {
    if (workspaces.length === 0) return;
    if (workspaceSlug) {
      const match = workspaces.find((w) => w.slug === workspaceSlug);
      if (match && match.id !== currentWorkspace?.id) {
        setCurrentWorkspace(match);
      }
    } else if (!currentWorkspace) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [workspaces, workspaceSlug, currentWorkspace, setCurrentWorkspace]);

  const activeSlug = currentWorkspace?.slug || workspaceSlug || (workspaces[0]?.slug ?? 'default');

  // Fetch projects for active workspace
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', activeSlug],
    queryFn: () => projectsApi.getProjects(activeSlug),
    enabled: !!activeSlug,
  });

  // Sync currentProject
  useEffect(() => {
    if (projects.length === 0) return;
    if (projectKey) {
      const match = projects.find((p) => p.key === projectKey);
      if (match && match.id !== currentProject?.id) {
        setCurrentProject(match);
      }
    } else if (!currentProject) {
      setCurrentProject(projects[0]);
    }
  }, [projects, projectKey, currentProject, setCurrentProject]);

  const activeProjectKey = currentProject?.key || projectKey || projects[0]?.key;

  // Fetch unread notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Search query for issues
  const { data: searchResults = [] } = useQuery({
    queryKey: ['search-issues', activeSlug, searchQuery],
    queryFn: () =>
      issuesApi.getIssues({
        workspace: currentWorkspace?.id,
        search: searchQuery,
      }),
    enabled: searchOpen && searchQuery.trim().length > 1,
  });

  // Keyboard shortcut Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
    },
    {
      name: 'Projects',
      href: `/${activeSlug}/projects`,
      icon: FolderIcon,
    },
    {
      name: 'Kanban Board',
      href: activeProjectKey ? `/${activeSlug}/projects/${activeProjectKey}/board` : `/${activeSlug}/projects`,
      icon: ViewColumnsIcon,
      disabled: !activeProjectKey,
    },
    {
      name: 'Backlog & Sprints',
      href: activeProjectKey ? `/${activeSlug}/projects/${activeProjectKey}/backlog` : `/${activeSlug}/projects`,
      icon: QueueListIcon,
      disabled: !activeProjectKey,
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: BellIcon,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      name: 'Audit Log',
      href: `/${activeSlug}/audit-log`,
      icon: ClipboardDocumentListIcon,
    },
    {
      name: 'Billing & Plans',
      href: `/${activeSlug}/billing`,
      icon: CreditCardIcon,
    },
    {
      name: 'Settings',
      href: `/${activeSlug}/settings`,
      icon: Cog6ToothIcon,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out lg:static',
          sidebarCollapsed ? 'w-20' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-3 border-b border-gray-100">
          <WorkspaceSwitcher isCollapsed={sidebarCollapsed} />
          {mobileMenuOpen && (
            <button
              type="button"
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Quick Create Button */}
          <button
            type="button"
            onClick={() => setCreateIssueOpen(true)}
            className={cn(
              'w-full flex items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500',
              sidebarCollapsed ? 'p-2' : ''
            )}
            title="Create Issue"
          >
            <PlusIcon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="ml-2 text-sm">Create Issue</span>}
          </button>

          {/* Main Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/dashboard' || item.href === '/notifications'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors group relative',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900',
                      item.disabled && 'opacity-40 pointer-events-none'
                    )
                  }
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      sidebarCollapsed ? 'mx-auto' : 'mr-3',
                      'text-gray-500 group-hover:text-gray-900'
                    )}
                  />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'rounded-full bg-indigo-600 text-[10px] font-bold text-white px-1.5 py-0.5',
                        sidebarCollapsed ? 'absolute top-1 right-1' : 'ml-auto'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Projects Quick List */}
          {!sidebarCollapsed && projects.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Projects
                </span>
                <NavLink
                  to={`/${activeSlug}/projects`}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View all
                </NavLink>
              </div>
              <div className="space-y-0.5">
                {projects.slice(0, 5).map((project) => {
                  const isCurrent = currentProject?.id === project.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setCurrentProject(project);
                        navigate(`/${activeSlug}/projects/${project.key}/board`);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors',
                        isCurrent
                          ? 'bg-gray-100 text-gray-900 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <span
                        className="mr-2.5 h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <span className="truncate flex-1">{project.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono ml-1">
                        {project.key}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle & Bottom User Info */}
        <div className="border-t border-gray-100 p-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </button>
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <SparklesIcon className="h-3.5 w-3.5 text-indigo-500" />
              <span>Multi-Tenant Pro</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="lg:hidden -ml-1.5 p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Breadcrumb / Workspace title */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500 font-medium">
              <span className="text-gray-900 font-semibold">
                {currentWorkspace?.name || 'Workspace'}
              </span>
              {currentProject && (
                <>
                  <span>/</span>
                  <span className="text-indigo-600 font-semibold">{currentProject.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Header: Search bar + Notification + User Avatar */}
          <div className="flex items-center space-x-3">
            {/* Quick Search trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-gray-50/50 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors sm:w-60"
            >
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 text-left">Search issues...</span>
              <kbd className="hidden sm:inline-block rounded bg-white px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 text-gray-500">
                Ctrl K
              </kbd>
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
              )}
            </button>

            {/* User Dropdown */}
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                >
                  <Avatar user={user} size="sm" showStatus status="online" />
                </button>
              }
              items={[
                {
                  label: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'My Profile',
                  icon: <UserCircleIcon className="h-4 w-4" />,
                  onClick: () => navigate(`/${activeSlug}/settings`),
                },
                {
                  label: 'Workspace Settings',
                  icon: <Cog6ToothIcon className="h-4 w-4" />,
                  onClick: () => navigate(`/${activeSlug}/settings`),
                },
                {
                  label: 'Billing & Plans',
                  icon: <CreditCardIcon className="h-4 w-4" />,
                  onClick: () => navigate(`/${activeSlug}/billing`),
                },
                { divider: true },
                {
                  label: 'Log out',
                  icon: <ArrowRightOnRectangleIcon className="h-4 w-4" />,
                  danger: true,
                  onClick: handleLogout,
                },
              ]}
            />
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Create Issue Modal */}
      <CreateIssueModal
        isOpen={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
        defaultProjectId={currentProject?.id}
      />

      {/* Global Search Modal (Ctrl + K) */}
      <Modal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search Issues"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or sequence..."
              className="block w-full rounded-xl border border-gray-300 pl-11 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {searchQuery.trim().length > 1 && searchResults.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-500">
                No issues match "{searchQuery}"
              </p>
            )}
            {searchResults.map((issue: Issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  navigate(`/${activeSlug}/issues/${issue.id}`);
                }}
                className="flex w-full items-center justify-between py-2.5 px-3 hover:bg-gray-50 rounded-lg text-left transition-colors"
              >
                <div className="truncate">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-indigo-600">
                      #{issue.sequence_number}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {issue.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {issue.description || 'No description'}
                  </p>
                </div>
                <div className="ml-4 shrink-0 flex items-center space-x-2">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    {issue.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AppLayout;
