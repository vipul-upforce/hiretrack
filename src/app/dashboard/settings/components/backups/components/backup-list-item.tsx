import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/components/ui/file-upload';
import {
  Calendar,
  FileIcon,
  HardDrive,
  LucideDownload,
  Trash,
} from 'lucide-react';
import { BackupFile } from '../types';

interface BackupListItemProps {
  file: BackupFile;
  loading: boolean;
  onDelete: (fileName: string) => void;
}

export function BackupListItem({
  file,
  loading,
  onDelete,
}: BackupListItemProps) {
  return (
    <div className="flex items-center justify-between p-3 px-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center space-x-3 w-full">
        <FileIcon className="h-4 w-4 text-gray-500" />
        <div className="flex flex-col w-full">
          <span className="text-sm w-full text-wrap break-all font-medium">
            {file.name}
          </span>
          <div className="flex flex-row justify-start items-center gap-4">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(file.createdAt).toLocaleString('in-us')}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={file.url}
          download={file.name}
          className="text-blue-500 hover:text-blue-700 transition-colors"
        >
          <LucideDownload className="w-4 h-4" />
        </a>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDelete(file.name)}
          disabled={loading}
          className="text-red-600 hover:text-red-700"
        >
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
