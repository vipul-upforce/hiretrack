"use client";

import { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  HardDrive,
} from "lucide-react";

import { useGetDiskSpaceQuery } from "@/lib/features/settings/settingsApi";
import { cn } from "@/lib/utils";
import { DirectoryContents } from "./directory-contents";

export function DiskSpaceSection() {
  const { data, isLoading } = useGetDiskSpaceQuery();
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>(
    {}
  );

  const toggleRoot = (rootName: string) => {
    setExpandedRoots((prev) => ({
      ...prev,
      [rootName]: !prev[rootName],
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 border rounded-lg flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="font-mono text-sm">Loading storage mapping...</span>
      </div>
    );
  }

  return (
    <div className="mb-8 border rounded-lg bg-card shadow-sm overflow-hidden w-[95%] mx-auto">
      <div className="bg-muted/40 px-4 py-3 border-b flex justify-between items-center">
        <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2">
          <HardDrive className="w-4 h-4" /> System Logs & Storage
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {data?.folders.length ?? 0} Roots
        </span>
      </div>

      <div className="divide-y divide-border">
        {data?.folders.map((folder) => {
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

                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border">
                  {folder.size}
                </span>
              </div>

              {/* Root Contents (Level 0) */}
              {isOpen && (
                <div className="border-t border-dashed">
                  <DirectoryContents root={folder.name} path="" level={0} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
