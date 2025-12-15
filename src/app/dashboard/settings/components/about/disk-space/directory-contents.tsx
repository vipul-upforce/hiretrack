'use client';

import { Loader2 } from 'lucide-react';
import { useGetDiskFolderDetailsQuery } from '@/lib/features/settings/settingsApi';
import { FileTreeItem } from './file-tree-item';

interface DirectoryContentsProps {
  root: string;
  path: string;
  level: number;
}

export function DirectoryContents({
  root,
  path,
  level,
}: DirectoryContentsProps) {
  const { data, isFetching, isError } = useGetDiskFolderDetailsQuery(
    { root, path },
    { refetchOnMountOrArgChange: false },
  );

  if (isFetching) {
    return (
      <div className="py-2 pl-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="font-mono">Reading...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-2 pl-8 text-xs text-red-500 font-mono">
        Failed to load directory.
      </div>
    );
  }

  if (!data?.files?.length) {
    return (
      <div className="py-2 pl-8">
        <span className="text-xs text-muted-foreground italic">
          Empty directory
        </span>
      </div>
    );
  }
  const sortedItems = [...data.files].sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      {sortedItems.map((file) => (
        <FileTreeItem key={file.name} item={file} root={root} level={level} />
      ))}
    </div>
  );
}
