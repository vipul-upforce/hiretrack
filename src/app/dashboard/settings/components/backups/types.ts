export interface BackupFile {
  name: string;
  url: string;
  createdAt: string;
  size: number;
}

export interface BackupStats {
  totalSize: number;
  totalCount: number;
  oldestBackup: string | null;
  newestBackup: string | null;
  averageSize: number;
}
