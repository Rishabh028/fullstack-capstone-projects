import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Workspace, Project } from '@/types';

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      setCurrentWorkspace: (workspace: Workspace | null) => {
        set({ currentWorkspace: workspace });
      },
      currentProject: null,
      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });
      },
      resetWorkspace: () => {
        set({ currentWorkspace: null, currentProject: null });
      },
    }),
    {
      name: 'saas-workspace-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
