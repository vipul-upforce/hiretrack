"use client";

import { useState, useCallback, useRef } from "react";
import { FileUploader } from "./file-uploader";
import { FileList } from "./file-list";
import { BatchProgress } from "./batch-progress";
import { CompletedBatches } from "./completed-batches";
import { Button } from "@/components/ui/button";
import { processBatch } from "@/lib/actions/process-files";
import { v4 as uuidv4 } from "uuid";

export type FileWithPreview = {
  id: string;
  file: File;
  preview?: string;
  error?: string;
};

export type Batch = {
  id: string;
  files: FileWithPreview[];
  status: "pending" | "processing" | "completed" | "failed";
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  timestamp: number;
  failedFiles: FileWithPreview[];
};

export function CVBatchProcessor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [completedBatches, setCompletedBatches] = useState<Batch[]>([]);
  const processingRef = useRef(false);

  const handleFilesAdded = useCallback((newFiles: FileWithPreview[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }, []);

  const handleProcessBatch = async () => {
    if (files.length === 0 || processingRef.current) return;

    processingRef.current = true;
    const batchId = uuidv4();

    const newBatch: Batch = {
      id: batchId,
      files: [...files],
      status: "processing",
      progress: {
        total: files.length,
        processed: 0,
        successful: 0,
        failed: 0,
      },
      timestamp: Date.now(),
      failedFiles: [],
    };

    setCurrentBatch(newBatch);

    try {
      // Process files one by one to track progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Call the server action to process the file
          await processBatch(file.file);

          // Update progress
          setCurrentBatch((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              progress: {
                ...prev.progress,
                processed: i + 1,
                successful: prev.progress.successful + 1,
              },
            };
          });
        } catch (error) {
          // Update progress with failure
          setCurrentBatch((prev) => {
            if (!prev) return null;
            const failedFile = {
              ...file,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to process file",
            };
            return {
              ...prev,
              progress: {
                ...prev.progress,
                processed: i + 1,
                failed: prev.progress.failed + 1,
              },
              failedFiles: [...prev.failedFiles, failedFile],
            };
          });
        }
      }

      // Mark batch as completed
      setCurrentBatch((prev) => {
        if (!prev) return null;
        const completedBatch = {
          ...prev,
          status: "completed" as const,
        };

        // Add to completed batches
        setCompletedBatches((prevBatches) => [completedBatch, ...prevBatches]);

        return completedBatch;
      });

      // Clear current files after processing
      setFiles([]);
    } catch {
      setCurrentBatch((prev) => {
        if (!prev) return null;
        const failedBatch = {
          ...prev,
          status: "failed" as const,
        };

        // Add to completed batches even if failed
        setCompletedBatches((prevBatches) => [failedBatch, ...prevBatches]);

        return failedBatch;
      });
    } finally {
      processingRef.current = false;
      // Reset current batch after a delay to show final progress
      setTimeout(() => {
        setCurrentBatch(null);
      }, 2000);
    }
  };

  return (
    <div className="space-y-8">
      <FileUploader onFilesAdded={handleFilesAdded} />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Current Batch</h2>
            <Button
              onClick={handleProcessBatch}
              disabled={files.length === 0 || !!currentBatch}
            >
              Process Batch
            </Button>
          </div>
          <FileList
            files={files}
            onRemove={handleRemoveFile}
            isProcessing={!!currentBatch}
          />
        </div>
      )}

      {currentBatch && <BatchProgress batch={currentBatch} />}

      {completedBatches.length > 0 && (
        <CompletedBatches batches={completedBatches} />
      )}
    </div>
  );
}
