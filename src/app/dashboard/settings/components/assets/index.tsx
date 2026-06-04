'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/components/ui/file-upload';
import { toast } from '@/hooks/use-toast';
import { FolderIcon, Loader, LucideDownload } from 'lucide-react';
import {
  useFetchAssetsMetadataQuery,
  useDownloadAssetsMutation,
} from '@/lib/features/settings';
import logger from '@/lib/logger';
import AssetsLoadingSkeleton from './loading-skeleton';

interface AssetMetadata {
  name: string;
  type: 'directory';
  path: string;
  size: number;
  lastArchivedAt: string | null;
}

export default function AssetsDialog() {
  const { data, isLoading, isFetching, isError, error } =
    useFetchAssetsMetadataQuery(undefined);

  const [triggerDownload, { isLoading: isDownloading }] =
    useDownloadAssetsMutation();

  const [downloadPhase, setDownloadPhase] = useState<
    'idle' | 'prepare' | 'download'
  >('idle');
  const [partProgress, setPartProgress] = useState({ current: 0, total: 0 });

  const assetsMetadata: AssetMetadata | null = data?.data || null;

  const archiveAssets = async () => {
    setDownloadPhase('prepare');
    setPartProgress({ current: 0, total: 0 });
    try {
      const { blob, filename } = await triggerDownload({
        onProgress: (current, total, phase) => {
          setDownloadPhase(phase);
          if (phase === 'download') {
            setPartProgress({ current, total });
          }
        },
      }).unwrap();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Assets archived successfully',
        description: 'Assets archive has been downloaded.',
      });
    } catch (err) {
      logger.error('Failed to archive assets:', err);
      const errMessage =
        (err as { data?: { message?: string }; error?: string })?.data
          ?.message ??
        (err as { error?: string })?.error ??
        'Failed to create assets archive';
      toast({
        title: 'Error',
        description: errMessage,
        variant: 'destructive',
      });
    } finally {
      setDownloadPhase('idle');
      setPartProgress({ current: 0, total: 0 });
    }
  };

  const downloadStatusLabel =
    downloadPhase === 'prepare'
      ? 'Preparing archive…'
      : downloadPhase === 'download' && partProgress.total > 0
        ? `Downloading part ${partProgress.current} of ${partProgress.total}…`
        : null;

  if (isLoading || isFetching) return <AssetsLoadingSkeleton />;

  if (isError) {
    return (
      <div className="py-6 text-center text-red-500">
        Failed to load assets metadata:{' '}
        {(error as { data?: { message?: string } })?.data?.message ||
          'Unknown error'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {assetsMetadata ? (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <FolderIcon className="h-4 w-4" />
            <div className="flex w-full items-center justify-between pr-4">
              <div className="flex flex-col">
                <span className="text-sm">{assetsMetadata.name}</span>
                <span className="text-xs text-gray-500">
                  Size: {formatFileSize(assetsMetadata.size)}
                </span>
                <span className="text-xs text-gray-500">
                  Last Archived: {assetsMetadata.lastArchivedAt ?? 'Never'}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                {downloadStatusLabel ? (
                  <span className="text-xs text-gray-500">
                    {downloadStatusLabel}
                  </span>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={archiveAssets}
                  className="text-portal-primary text-xs hover:underline"
                  disabled={isDownloading}
                  aria-busy={isDownloading}
                >
                  {isDownloading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <LucideDownload className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>No assets metadata available.</p>
      )}
    </div>
  );
}
