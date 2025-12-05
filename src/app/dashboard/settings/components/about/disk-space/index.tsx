'use client';

import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { useGetDiskSpaceQuery } from "@/lib/features/settings/settingsApi";
import { cn } from "@/lib/utils";
import { DirectoryContents } from "./directory-contents";
import { DiskStatsWidget } from "./disk-stats-widget";
import { DiskSpaceSkeleton } from "./loading-skeleton";

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
    <div className="w-[95%] mx-auto space-y-6 mb-8">
      {diskStats && <DiskStatsWidget stats={diskStats} />}

      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="bg-muted/60 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-xs font-semibold text-muted-foreground">
            Monitored Directories
          </span>
          <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-0.5 rounded border">
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
                <div
                  onClick={() => toggleRoot(folder.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    isOpen && "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
                    )}

                    {isOpen ? (
                      <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Folder className="w-4 h-4 text-muted-foreground" />
                    )}

                    <span className="text-sm font-medium text-foreground">
                      {folder.name}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border min-w-[3rem] text-center">
                    {folder.size}
                  </span>
                </div>

                {isOpen && (
                  <div className="border-t border-dashed relative">
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
