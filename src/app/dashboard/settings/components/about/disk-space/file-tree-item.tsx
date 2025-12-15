'use client';

import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiskFolderItem } from '@/lib/features/settings/settingsApi';
import { DirectoryContents } from './directory-contents';

interface FileTreeItemProps {
  item: DiskFolderItem;
  root: string;
  level: number;
}

export function FileTreeItem({ item, root, level }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = item.type === 'folder';

  // Indentation calculation
  const paddingLeft = `${(level + 1) * 1.5}rem`;

  const handleToggle = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    }
  };

  const folderOrFileIcon = (folder: boolean) => {
    if (folder) {
      return isOpen ? (
        <FolderOpen className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
      ) : (
        <Folder className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
      );
    }

    return <FileText className="h-4 w-4 shrink-0 text-slate-500" />;
  };

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center justify-between border-b border-border/40 py-2 pr-4 transition-colors last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800',
          isFolder ? 'cursor-pointer' : 'cursor-default',
        )}
        style={{ paddingLeft }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Chevron for Folders */}
          <div className="flex w-4 shrink-0 justify-center">
            {isFolder &&
              (isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ))}
          </div>

          {/* Icon */}
          {folderOrFileIcon(isFolder)}

          <span
            className={cn(
              'truncate font-mono text-sm',
              isFolder
                ? 'font-medium text-foreground'
                : 'text-slate-600 dark:text-slate-300',
            )}
          >
            {item.name}
          </span>
        </div>

        <span className="ml-4 shrink-0 font-mono text-xs text-muted-foreground">
          {item.size}
        </span>
      </button>

      {/* Recursive Render if Folder is Open */}
      {isFolder && isOpen && (
        <div className="ml-[calc(1.5rem_*_var(--level))] border-l border-border/30">
          <DirectoryContents
            root={root}
            path={item.relativePath || ''}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
}
