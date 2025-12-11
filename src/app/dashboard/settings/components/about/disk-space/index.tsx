'use client';

import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { useGetDiskSpaceQuery } from '@/lib/features/settings/settingsApi';
import { cn } from '@/lib/utils';
import { DirectoryContents } from './directory-contents';
import { DiskStatsWidget } from './disk-stats-widget';
import { DiskSpaceSkeleton } from './loading-skeleton';

export function DiskSpaceSection() {
  const { data, isLoading } = useGetDiskSpaceQuery();
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>(
    {},
  );

  const toggleRoot = (rootName: string) => {
    setExpandedRoots((prev) => ({
      ...prev,
      [rootName]: !prev[rootName],
    }));
  };

  if (isLoading) {
    return <DiskSpaceSkeleton />;
  }

  const { diskStats, folders } = data || {};

  return (
    <div className="mx-auto mb-8 w-[95%] space-y-6">
      {diskStats && <DiskStatsWidget stats={diskStats} />}

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Monitored Directories
          </span>
          <span className="rounded border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {folders?.length ?? 0} Roots
          </span>
        </div>

        {/* Folders List Content */}
        <div className="divide-y divide-border">
          {folders?.map((folder) => {
            const isOpen = expandedRoots[folder.name];

            return (
              <div key={folder.name} className="bg-background">
                {/* Root Header */}
                <button
                  type="button"
                  onClick={() => toggleRoot(folder.name)}
                  className={cn(
                    'flex w-full cursor-pointer select-none items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50',
                    isOpen && 'bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                    )}

                    {isOpen ? (
                      <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Folder className="h-4 w-4 text-muted-foreground" />
                    )}

                    <span className="text-sm font-medium text-foreground">
                      {folder.name}
                    </span>
                  </div>

                  <span className="min-w-[3rem] rounded border bg-muted px-2 py-0.5 text-center font-mono text-xs text-muted-foreground">
                    {folder.size}
                  </span>
                </button>

                {isOpen && (
                  <div className="relative border-t border-dashed">
                    <DirectoryContents root={folder.name} path="" level={0} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
