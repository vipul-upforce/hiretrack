'use client';

import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/components/ui/file-upload';
import { toast } from '@/hooks/use-toast';
import { FolderIcon, Loader, LucideDownload } from 'lucide-react';
import { useFetchAssetsMetadataQuery } from '@/lib/features/settings/settingsApi';
import { useState } from 'react';
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
  const { data, isLoading, isFetching, isError, error, refetch } =
    useFetchAssetsMetadataQuery(undefined);

  const [downloading, setDownloading] = useState(false);
  const assetsMetadata: AssetMetadata | null = data?.data || null;

  const archiveAssets = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/download/assets');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create assets archive');
      }

      const contentDisposition = res.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : `assets-${Date.now()}.tar.gz`;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Assets archived successfully',
        description: 'Assets archive has been downloaded.',
      });

      refetch();
    } catch (err) {
      logger.error('Failed to archive assets:', err);
      toast({
        title: 'Error',
        description: 'Failed to create assets archive',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || isFetching) return <AssetsLoadingSkeleton />;

  if (isError) {
    return (
      <div className="py-6 text-center text-red-500">
        Failed to load assets metadata:{' '}
        {(error as any)?.data?.message || 'Unknown error'}
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

              <Button
                variant="ghost"
                onClick={archiveAssets}
                className="text-portal-primary text-xs hover:underline"
                disabled={downloading}
              >
                {downloading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <LucideDownload className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p>No assets metadata available.</p>
      )}
    </div>
  );
}
