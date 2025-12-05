import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/components/ui/file-upload';
import {
  Calendar, Database, FileIcon, HardDrive, Loader2,
} from 'lucide-react';
import { BackupStats } from '../types';

interface BackupSummaryCardProps {
  stats: BackupStats;
  onTakeSnapshot: () => void;
  isTakingSnapshot: boolean;
  disabled: boolean;
}

export function BackupSummaryCard({
  stats,
  onTakeSnapshot,
  isTakingSnapshot,
  disabled,
}: BackupSummaryCardProps) {
  return (
    <div className="mb-4 p-4 bg-white dark:bg-black rounded-lg border">
      <div className="flex flex-row justify-between ">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Backup Summary
        </h3>
        <Button onClick={onTakeSnapshot} disabled={disabled} variant="primary">
          {isTakingSnapshot ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Take Snapshot
            </>
          )}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">Total Size:</span>
          <span className="font-medium">{formatFileSize(stats.totalSize)}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileIcon className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Total Backups:
          </span>
          <span className="font-medium">{stats.totalCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">Oldest:</span>
          <span className="font-medium text-xs">
            {stats.oldestBackup || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">Newest:</span>
          <span className="font-medium text-xs">
            {stats.newestBackup || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <HardDrive className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Average Size:
          </span>
          <span className="font-medium">
            {formatFileSize(stats.averageSize)}
          </span>
        </div>
      </div>
    </div>
  );
}
