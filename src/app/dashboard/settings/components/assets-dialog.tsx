"use client";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/components/ui/file-upload";
import { toast } from "@/hooks/use-toast";
import { FolderIcon, Loader, LucideDownload } from "lucide-react";
import { useFetchAssetsMetadataQuery } from "@/lib/features/settings/settingsApi"; // adjust path
import { useState } from "react";

interface AssetMetadata {
  name: string;
  type: "directory";
  path: string;
  size: number;
  lastArchivedAt: string | null;
}

export default function AssetsDialog() {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useFetchAssetsMetadataQuery(undefined);

  const [downLoading, setDownloading] = useState(false);
  const assetsMetadata: AssetMetadata | null = data?.data || null;

  const archiveAssets = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/download/assets");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create assets archive");
      }

      // Extract the file name from the Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : `assets-${Date.now()}.tar.gz`;

      // Convert response to blob and trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Assets archived successfully",
        description: "Assets archive has been downloaded.",
      });

      // refetch metadata after successful download
      refetch();
    } catch (err) {
      console.error("Failed to archive assets:", err);
      toast({
        title: "Error",
        description: `Failed to create assets archive`,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-4 animate-pulse">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded" />

            <div className="w-full flex items-center justify-between pr-4">
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>

              <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500 py-6">
        Failed to load assets metadata:{" "}
        {(error as any)?.data?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {assetsMetadata ? (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <FolderIcon className="h-4 w-4" />
            <div className="w-full flex items-center justify-between pr-4">
              <div className="flex flex-col">
                <span className="text-sm">{assetsMetadata.name}</span>
                <span className="text-xs text-gray-500">
                  Size: {formatFileSize(assetsMetadata.size)}
                </span>
                <span className="text-xs text-gray-500">
                  Last Archived: {assetsMetadata.lastArchivedAt ?? "Never"}
                </span>
              </div>

              <Button
                variant="ghost"
                onClick={archiveAssets}
                className="text-xs text-blue-500 hover:underline"
                disabled={downLoading}
              >
                {downLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <LucideDownload className="w-4 h-4" />
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
