"use client";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/components/ui/file-upload";
import { toast } from "@/hooks/use-toast";
import { FolderIcon, Loader, LucideDownload } from "lucide-react";
import { useEffect, useState } from "react";

interface AssetMetadata {
  name: string;
  type: "directory";
  path: string;
  size: number;
  lastArchivedAt: string | null;
}

export default function AssetsDialog() {
  const [assetsMetadata, setAssetsMetadata] = useState<AssetMetadata | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [downLoading, setDownloading] = useState(false);

  const fetchAssetsMetadata = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/download/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty body as per the POST endpoint
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch assets metadata");
      }
      const data = await res.json();
      setAssetsMetadata(data.data);
    } catch (err) {
      console.error("Failed to load assets metadata:", err);
      //   toast({
      //     title: "Error",
      //     description: `Failed to load assets metadata`,
      //     variant: "destructive",
      //   });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsMetadata();
  }, []);

  const archiveAssets = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/download/assets");
      setDownloading(false);
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
      await fetchAssetsMetadata();
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

  return (
    <div className="">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
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
                      Last Archived:{" "}
                      {assetsMetadata.lastArchivedAt
                        ? assetsMetadata.lastArchivedAt
                        : "Never"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => archiveAssets()}
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
        </>
      )}
    </div>
  );
}
