'use client';

import React from 'react';
import { UserSummary } from '@/types';

interface PresenceBarProps {
  collaborators: Array<{
    clientId: number;
    user: {
      name: string;
      color: string;
      avatar?: string | null;
      email?: string;
    };
  }>;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ collaborators }) => {
  // Deduplicate by name/color so each person only has one avatar
  const uniqueCollaborators = React.useMemo(() => {
    const map = new Map<string, typeof collaborators[0]>();
    collaborators.forEach((c) => {
      if (c.user && c.user.name) {
        map.set(c.user.name, c);
      }
    });
    return Array.from(map.values());
  }, [collaborators]);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center -space-x-2 overflow-hidden px-1">
        {uniqueCollaborators.map((c, index) => {
          const initials = c.user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={`${c.user.name}-${index}`}
              className="relative group cursor-pointer transition-transform duration-150 hover:scale-110 hover:z-30"
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: c.user.color || '#6366f1' }}
              >
                {initials}
              </div>

              {/* Online Green Dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800 animate-pulse" />

              {/* Tooltip */}
              <div className="absolute right-0 top-10 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                <div className="bg-slate-900 text-white text-xs font-medium py-1 px-2.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.user.color }}
                  />
                  <span>{c.user.name}</span>
                  <span className="text-slate-400 text-[10px]">(Online)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ml-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>{uniqueCollaborators.length} online</span>
      </div>
    </div>
  );
};
