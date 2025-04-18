"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FileUploader } from "./file-uploader";
import { FileList } from "./file-list";
import { CompletedBatches } from "./completed-batches";
import { Button } from "@/components/ui/button";
import {
  usePostBatchMutation,
  useFetchBatchesQuery,
} from "@/lib/features/org/orgApi";
import { useToast } from "@/hooks/use-toast";

export type FileWithPreview = {
  id: string;
  file: File;
  preview?: string;
  error?: string;
  isZip?: boolean;
};

export type ProcessedItem = {
  filename: string;
  candidateId: string;
  status: "success" | "failure";
  message: string;
  error?: string;
  processedAt: string;
  _id: string;
};

export type Batch = {
  _id: string;
  organizationId: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  status: "pending" | "processing" | "completed" | "failed";
  items: ProcessedItem[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const ORGANIZATION_ID = "67f8b96242e3672573cb198e";

export function CVBatchProcessor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [completedBatches, setCompletedBatches] = useState<Batch[]>([]);
  const processingRef = useRef(false);
  const [postBatch] = usePostBatchMutation();
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  // Fetch all batches using RTK Query
  const {
    data: batches,
    error,
    isLoading,
  } = useFetchBatchesQuery(ORGANIZATION_ID);

  useEffect(() => {
    if (batches) {
      setCompletedBatches(batches);
    }
  }, [batches]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const processedFiles = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      isZip: file.type === "application/zip" || file.name.endsWith(".zip"),
    }));
    setFiles((prevFiles) => [...prevFiles, ...processedFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }, []);

  const handleProcessBatch = async () => {
    if (files.length === 0 || processingRef.current) return;
    setIsPosting(true);
    processingRef.current = true;

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file.file);
      });

      const { data: batchResult, error } = await postBatch({
        formData,
        organizationId: ORGANIZATION_ID,
      });
      if (error) {
        toast({
          title: "Batch Not Processed",
          description:
            "data" in error &&
            typeof error.data === "object" &&
            error.data &&
            "message" in error.data
              ? String(error.data.message)
              : "Failed to process batch",
        });
        return;
      }

      setCompletedBatches((prevBatches) => [batchResult, ...prevBatches]);
      setFiles([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to process batch");
    } finally {
      processingRef.current = false;
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-8">
      <FileUploader isProcessing={isPosting} onFilesAdded={handleFilesAdded} />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Current Batch</h2>
            <Button
              onClick={handleProcessBatch}
              disabled={files.length === 0 || isPosting}
            >
              {isPosting ? "Processing..." : "Process Batch"}
            </Button>
          </div>
          <FileList
            isProcessing={isPosting}
            files={files}
            onRemove={handleRemoveFile}
          />
        </div>
      )}

      {isLoading && <p>Loading batches...</p>}
      {error && <p>Error fetching batches: </p>}
      {completedBatches.length > 0 && (
        <CompletedBatches batches={completedBatches} />
      )}
    </div>
  );
}
