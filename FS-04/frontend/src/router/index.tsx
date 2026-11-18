import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AppLayout from '@/components/layout/AppLayout';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectsPage from '@/pages/ProjectsPage';
import BoardPage from '@/pages/BoardPage';
import BacklogPage from '@/pages/BacklogPage';
import IssueDetailPage from '@/pages/IssueDetailPage';
import SettingsPage from '@/pages/SettingsPage';
import BillingPage from '@/pages/BillingPage';
import NotificationsPage from '@/pages/NotificationsPage';
import AuditLogPage from '@/pages/AuditLogPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Root redirect handler
const RootRedirect: React.FC = () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: ':workspaceSlug/projects',
        element: <ProjectsPage />,
      },
      {
        path: ':workspaceSlug/projects/:projectKey/board',
        element: <BoardPage />,
      },
      {
        path: ':workspaceSlug/projects/:projectKey/backlog',
        element: <BacklogPage />,
      },
      {
        path: ':workspaceSlug/issues/:issueId',
        element: <IssueDetailPage />,
      },
      {
        path: ':workspaceSlug/settings',
        element: <SettingsPage />,
      },
      {
        path: ':workspaceSlug/billing',
        element: <BillingPage />,
      },
      {
        path: ':workspaceSlug/audit-log',
        element: <AuditLogPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
