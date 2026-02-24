'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { File, Download } from 'lucide-react';
import { DialogTitle } from '@radix-ui/react-dialog';
import logger from '@/lib/logger';
import Image from 'next/image';

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
      logger.error('Invalid URL or filename provided');
      return;
    }

    try {
      // Fetch the file as a blob
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      logger.error('Download failed:', error);
    }
  };

  return (
    <>
      <div className="grid gap-2">
        {files.map((file) => (
          <div
            key={file.url}
            className="group flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:hover:bg-gray-700"
          >
            <button
              type="button"
              className="flex w-full flex-1 cursor-pointer items-center gap-2 text-left"
              onClick={() => {
                setSelectedFile(file);
              }}
            >
              <div className="rounded-md bg-gray-200 p-3 dark:bg-gray-600">
                <svg
                  className="h-5 w-5 text-gray-600 dark:text-gray-300"
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
              <div className="w-[90%] flex-1">
                <p className="truncate text-wrap break-all text-sm font-medium text-gray-900 dark:text-gray-100">
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(file.size / 1024)}
                    KB
                  </p>
                )}
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 opacity-100 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-100"
              onClick={() => {
                const url = file.url || file.base64;
                if (url) {
                  downloadFile(url, file.name);
                }
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="flex h-[90vh] flex-col justify-start p-0 sm:max-w-[80vw] xl:max-w-[50vw]">
          <DialogTitle />
          <div
            className="shrink-0 border-b border-gray-200 bg-white pl-4 dark:border-gray-700 dark:bg-black"
            style={{
              display: 'contents',
            }}
          >
            <div className="flex items-center gap-2 py-3 pl-4">
              <File className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                {selectedFile?.name}
              </span>
            </div>

            <button
              type="button"
              className="absolute right-12 top-4 rounded-sm text-gray-600 opacity-70 ring-offset-background transition-opacity hover:text-gray-900 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => {
                if (selectedFile) {
                  const url = selectedFile.url ?? selectedFile.base64;
                  if (url) {
                    downloadFile(url, selectedFile.name);
                  }
                }
              }}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedFile?.type.startsWith('image/') ? (
              <div className="flex min-h-full items-center justify-center p-4">
                <Image
                  src={selectedFile.url! || selectedFile.base64!}
                  alt={selectedFile.name}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="h-full w-full">
                <iframe
                  src={selectedFile?.url || selectedFile?.base64}
                  className="h-full w-full"
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
