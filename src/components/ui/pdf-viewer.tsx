"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { File, Download } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
interface PDFViewerProps {
  files: Array<{
    name: string;
    url: string;
    base64?: string;
    type: string;
    size?: number;
  }>;
}

export function PDFViewer({ files }: PDFViewerProps) {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    url: string;
    base64?: string;
    type: string;
    size?: number;
  } | null>(null);

  const downloadFile = async (url: string, filename: string) => {
    if (!url || !filename) {
      console.error("Invalid URL or filename provided");
      return;
    }

    try {
      // Fetch the file as a blob
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <>
      <div className="grid gap-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group w-full"
          >
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer w-full"
              onClick={() => {
                setSelectedFile(file);
              }}
            >
              <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-md">
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 w-[90%]">
                <p className="text-sm font-medium truncate break-all text-wrap text-gray-900 dark:text-gray-100">
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(file.size / 1024)}KB
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-100 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => downloadFile(file.url || file.base64, file.name)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 flex flex-col justify-start">
          <DialogTitle></DialogTitle>
          <div
            className="pl-4 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-black"
            style={{
              display: "contents",
            }}
          >
            <div className="flex items-center gap-2 pl-4 py-3">
              <File className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span className="font-medium truncate text-gray-900 dark:text-gray-100">
                {selectedFile?.name}
              </span>
            </div>

            <button
              className="absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => {
                // debugger;
                selectedFile &&
                  downloadFile(
                    selectedFile.url || selectedFile.base64,
                    selectedFile.name
                  );
              }}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedFile?.type.startsWith("image/") ? (
              <div className="flex items-center justify-center min-h-full p-4">
                <img
                  src={selectedFile.url || selectedFile.base64}
                  alt={selectedFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full h-full">
                <iframe
                  src={selectedFile?.url || selectedFile?.base64}
                  className="w-full h-full"
                  title={selectedFile?.name}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
