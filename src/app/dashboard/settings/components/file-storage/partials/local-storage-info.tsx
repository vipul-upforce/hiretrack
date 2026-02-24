'use client';

import { HardDrive, AlertCircle } from 'lucide-react';
import { useGetDiskSpaceQuery } from '@/lib/features/settings';
import { DiskStatsWidget } from '../../about/disk-space/disk-stats-widget';
import { LocalStorageInfoSkeleton } from './local-storage-info-skeleton';

export function LocalStorageInfo() {
  const { data, isLoading, isError } = useGetDiskSpaceQuery();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="h-4 w-4 text-primary" />
          Local Storage Information
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          When Local Storage is selected, all resumes, attachments, and related
          files are stored on this server&apos;s local disk. Keep regular backups
          and monitor available space to avoid upload failures.
        </p>
      </section>

      {isLoading && <LocalStorageInfoSkeleton />}

      {!isLoading && isError && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Unable to load system storage statistics right now.
          </p>
        </section>
      )}

      {!isLoading && data?.diskStats && <DiskStatsWidget stats={data.diskStats} />}
    </div>
  );
}
