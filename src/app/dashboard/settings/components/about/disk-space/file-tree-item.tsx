"use client";

import { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DirectoryContents } from "./directory-contents";
import { DiskFolderItem } from "@/lib/features/settings/settingsApi";

interface FileTreeItemProps {
  item: DiskFolderItem;
  root: string;
  level: number;
}

export function FileTreeItem({ item, root, level }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = item.type === "folder";

  // Indentation calculation
  const paddingLeft = `${(level + 1) * 1.5}rem`;

  const handleToggle = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="text-sm">
      <div
        onClick={handleToggle}
        className={cn(
          "flex items-center justify-between py-2 pr-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-border/40 last:border-0",
          isFolder ? "cursor-pointer" : "cursor-default"
        )}
        style={{ paddingLeft }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Chevron for Folders */}
          <div className="w-4 flex justify-center shrink-0">
            {isFolder &&
              (isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              ))}
          </div>

          {/* Icon */}
          {isFolder ? (
            isOpen ? (
              <FolderOpen className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
            )
          ) : (
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
          )}

          <span
            className={cn(
              "truncate font-mono text-sm",
              isFolder
                ? "text-foreground font-medium"
                : "text-slate-600 dark:text-slate-300"
            )}
          >
            {item.name}
          </span>
        </div>

        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-4">
          {item.size}
        </span>
      </div>

      {/* Recursive Render if Folder is Open */}
      {isFolder && isOpen && (
        <div className="border-l border-border/30 ml-[calc(1.5rem_*_var(--level))]">
          <DirectoryContents
            root={root}
            path={item.relativePath || ""}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
}
