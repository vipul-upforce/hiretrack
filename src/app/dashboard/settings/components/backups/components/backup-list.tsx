import { FileIcon } from "lucide-react";
import { BackupFile } from "../types";
import { BackupListItem } from "./backup-list-item";

interface BackupListProps {
  files: BackupFile[];
  loading: boolean;
  onDelete: (fileName: string) => void;
}

export function BackupList({ files, loading, onDelete }: BackupListProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <FileIcon className="h-4 w-4" />
        Backup Files ({files.length})
      </h3>
      <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
        {files.map((file, i) => (
          <BackupListItem
            key={`${file.name}-${i}`}
            file={file}
            loading={loading}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
