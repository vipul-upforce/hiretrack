import { FileIcon } from 'lucide-react';
import { BackupFile } from '../types';
import { BackupListItem } from './backup-list-item';

interface BackupListProps {
  files: BackupFile[];
  loading: boolean;
  onDelete: (fileName: string) => void;
}

export function BackupList({ files, loading, onDelete }: BackupListProps) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <FileIcon className="h-4 w-4" />
        Backup Files ({files.length})
      </h3>
      <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
        {files.map((file) => (
          <BackupListItem
            key={`${file.name}+${file.createdAt}`}
            file={file}
            loading={loading}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
