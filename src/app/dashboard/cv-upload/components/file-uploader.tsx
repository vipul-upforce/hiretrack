"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, type File } from "lucide-react";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { FileWithPreview } from "./cv-batch-processor";
import { Progress } from "@/components/ui/progress";

interface FileUploaderProps {
  onFilesAdded: (files: FileWithPreview[]) => void;
}

export function FileUploader({ onFilesAdded }: FileUploaderProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  const processFiles = useCallback(
    async (acceptedFiles: File[]) => {
      const processedFiles: FileWithPreview[] = [];

      for (const file of acceptedFiles) {
        if (file.type === "application/pdf") {
          // Handle PDF directly
          processedFiles.push({
            id: uuidv4(),
            file,
            preview: URL.createObjectURL(file),
          });
        } else if (
          file.type === "application/zip" ||
          file.name.endsWith(".zip")
        ) {
          // Handle ZIP file
          setIsExtracting(true);
          setExtractionProgress(0);

          try {
            const zip = new JSZip();
            const zipContents = await zip.loadAsync(file);
            const fileCount = Object.keys(zipContents.files).length;
            let processedCount = 0;

            // Extract PDF files from the ZIP
            for (const filename in zipContents.files) {
              const zipEntry = zipContents.files[filename];

              // Skip macOS metadata files and directories
              if (
                filename.startsWith("__MACOSX/") ||
                filename.includes("/._") ||
                filename.startsWith("._") ||
                zipEntry.dir
              ) {
                processedCount++;
                setExtractionProgress(
                  Math.round((processedCount / fileCount) * 100)
                );
                continue;
              }

              if (filename.toLowerCase().endsWith(".pdf")) {
                try {
                  // Get the blob content from the zip entry
                  const content = await zipEntry.async("blob");

                  // Create a file-like object instead of using the File constructor
                  const extractedFile = new Blob([content], {
                    type: "application/pdf",
                  });

                  // Extract just the filename without path
                  const actualFilename = filename.split("/").pop() || filename;

                  // Add custom properties to make it behave like a File object
                  Object.defineProperty(extractedFile, "name", {
                    value: actualFilename,
                    writable: false,
                  });

                  processedFiles.push({
                    id: uuidv4(),
                    file: extractedFile as File,
                    preview: URL.createObjectURL(extractedFile),
                  });
                } catch {}
              }

              processedCount++;
              setExtractionProgress(
                Math.round((processedCount / fileCount) * 100)
              );
            }
          } catch {
          } finally {
            setIsExtracting(false);
          }
        }
      }

      if (processedFiles.length > 0) {
        onFilesAdded(processedFiles);
      }
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
    },
    disabled: isExtracting,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${isExtracting ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">
            {isDragActive ? "Drop the files here" : "Drag & drop files here"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload PDF files or a ZIP containing PDFs
          </p>
          {!isDragActive && (
            <div className="mt-2 flex items-center justify-center">
              <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Browse files
              </span>
            </div>
          )}
        </div>
      </div>

      {isExtracting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Extracting ZIP file...</span>
            <span className="text-sm text-muted-foreground">
              {extractionProgress}%
            </span>
          </div>
          <Progress value={extractionProgress} className="h-2" />
        </div>
      )}
    </div>
  );
}
