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
    type: string;
    size?: number;
  }>;
}

export function PDFViewer({ files }: PDFViewerProps) {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    url: string;
    type: string;
    size?: number;
  } | null>(null);


  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="grid gap-2">
        {files.map((file, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "rgb(249 250 251 / var(--tw-bg-opacity, 1))",
            }}
            className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/50 transition-colors group w-full "
          >
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer w-full"
              onClick={() => setSelectedFile(file)}
            >
              <div className="p-3 bg-grey-100 rounded-md">
                <svg
                  className="w-5 h-5"
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
                <p className="text-sm font-medium truncate break-all text-wrap">{file.name}</p>
                {file.size && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(file.size / 1024)}KB
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => downloadFile(file.url, file.name)}
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
            className=" pl-4 border-b shrink-0"
            style={{
              display: "contents",
            }}
          >
            <div className="flex items-center gap-2 pl-4">
              <File className="h-4 w-4" />
              <span className="font-medium truncate">{selectedFile?.name}</span>
            </div>

            <button
              className="absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              onClick={() =>
                selectedFile &&
                downloadFile(selectedFile.url, selectedFile.name)
              }
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedFile?.type.startsWith("image/") ? (
              <div className="flex items-center justify-center min-h-full p-4">
                <img
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full h-full">
                <iframe
                  src={selectedFile?.url}
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
