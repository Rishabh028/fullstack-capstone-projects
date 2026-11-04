import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import {
  ChevronUpDownIcon,
  CheckIcon,
  PlusIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '@/store/workspaceStore';
import workspacesApi from '@/api/workspaces';
import { Workspace } from '@/types';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ isCollapsed = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace, setCurrentWorkspace, setCurrentProject } = useWorkspaceStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.getWorkspaces,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: () =>
      workspacesApi.createWorkspace({
        name: workspaceName,
        description: workspaceDesc,
      }),
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setCurrentWorkspace(newWorkspace);
      setCurrentProject(null);
      setIsCreateOpen(false);
      setWorkspaceName('');
      setWorkspaceDesc('');
      toast.success(`Workspace "${newWorkspace.name}" created!`);
      navigate(`/${newWorkspace.slug}/projects`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create workspace');
    },
  });

  const handleSelectWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setCurrentProject(null);
    navigate(`/${workspace.slug}/projects`);
  };

  const activeWorkspace =
    currentWorkspace || (workspaces.length > 0 ? workspaces[0] : null);

  return (
    <>
      <Menu as="div" className="relative w-full">
        <MenuButton
          type="button"
          className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-sm">
              {activeWorkspace?.name ? activeWorkspace.name.charAt(0).toUpperCase() : 'W'}
            </div>
            {!isCollapsed && (
              <div className="truncate text-left">
                <p className="truncate text-sm font-semibold text-gray-900 leading-tight">
                  {activeWorkspace?.name || 'Select Workspace'}
                </p>
                <p className="truncate text-[11px] font-medium text-gray-400 capitalize leading-tight">
                  {activeWorkspace?.plan || 'Free'} Plan
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-gray-400 ml-1" />
          )}
        </MenuButton>

        <Transition
          enter="transition duration-100 ease-out"
          enterFrom="transform scale-95 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition duration-75 ease-in"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-95 opacity-0"
        >
          <MenuItems className="absolute left-0 top-full mt-2 w-60 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 border border-gray-100">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspaces
            </div>
            {workspaces.map((workspace) => {
              const isSelected = activeWorkspace?.id === workspace.id;
              return (
                <MenuItem key={workspace.id}>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => handleSelectWorkspace(workspace)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-700 font-bold text-xs">
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{workspace.name}</span>
                      </div>
                      {isSelected && (
                        <CheckIcon className="h-4 w-4 shrink-0 text-indigo-600 ml-2" />
                      )}
                    </button>
                  )}
                </MenuItem>
              );
            })}

            <div className="my-1 border-t border-gray-100" />
            <MenuItem>
              {({ active }) => (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className={`flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors ${
                    active ? 'bg-gray-100 text-gray-900' : ''
                  }`}
                >
                  <PlusIcon className="mr-2 h-4 w-4 text-gray-400" />
                  <span>Create Workspace</span>
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Transition>
      </Menu>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Workspace"
        description="A workspace contains your team's projects, boards, and issues."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (workspaceName.trim()) {
              createWorkspaceMutation.mutate();
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Workspace Name"
            placeholder="Acme Corp, Engineering, etc."
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            required
            autoFocus
          />
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              placeholder="Brief description of this workspace"
              className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createWorkspaceMutation.isPending}
              disabled={!workspaceName.trim()}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default WorkspaceSwitcher;
