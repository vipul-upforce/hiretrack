'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  usePostBatchMutation,
  useFetchBatchesQuery,
} from '@/lib/features/org/orgApi';
import { useToast } from '@/hooks/use-toast';
import withAuthGuard from '@/components/withAuthGuard';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import { CompletedBatches } from './completed-batches';
import { FileList } from './file-list';
import { FileUploader } from './file-uploader';
import CvBatchLoader from './CvBatchLoader';

export type FileWithPreview = {
  id: string;
  file: File;
  preview?: string;
  error?: string;
  isZip?: boolean;
  skipped?: boolean;
  skipReason?: string;
};

// File size limits (same as backend)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
const BATCH_SIZE = 20; // Process 20 files at a time

export type ProcessedItem = {
  filename: string;
  candidateId: string;
  status: 'success' | 'failure';
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  items: ProcessedItem[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

interface ErrorResponse {
  error?: string;
}

export function CVBatchProcessor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [completedBatches, setCompletedBatches] = useState<Batch[]>([]);
  const processingRef = useRef(false);
  const [postBatch] = usePostBatchMutation();
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth || {});

  // Fetch all batches using RTK Query
  const {
    data: batches,
    error,
    isLoading,
  } = useFetchBatchesQuery(user ? (user?.organizationId as string) : '', {
    skip: !user?.organizationId,
  });

  useEffect(() => {
    if (batches) {
      setCompletedBatches(batches);
    }
  }, [batches]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const processedFiles: FileWithPreview[] = [];
    const skippedFiles: FileWithPreview[] = [];

    newFiles.forEach((file) => {
      const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
      const maxSize = isZip ? MAX_ZIP_SIZE : MAX_FILE_SIZE;
      const sizeLabel = isZip ? '100MB' : '10MB';

      if (file.size > maxSize) {
        skippedFiles.push({
          id: crypto.randomUUID(),
          file,
          isZip,
          skipped: true,
          skipReason: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${sizeLabel})`,
        });
      } else {
        processedFiles.push({
          id: crypto.randomUUID(),
          file,
          isZip,
        });
      }
    });

    if (skippedFiles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Some Files Skipped',
        description: `${skippedFiles.length} file(s) were skipped due to size limits. Maximum size: 10MB for PDFs, 100MB for ZIP files.`,
      });
    }

    setFiles((prevFiles) => [...prevFiles, ...processedFiles, ...skippedFiles]);
  }, [toast]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }, []);

  const handleProcessBatch = async () => {
    if (files.length === 0 || processingRef.current) return;

    // Filter out skipped files
    const filesToProcess = files.filter((f) => !f.skipped);
    if (filesToProcess.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Files to Process',
        description: 'All files were skipped due to size limits.',
      });
      return;
    }

    setIsPosting(true);
    processingRef.current = true;

    try {
      const organizationId = (user?.organizationId as string) || '';
      
      // Split files into chunks for batch processing
      const chunks: File[][] = [];
      for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
        chunks.push(filesToProcess.slice(i, i + BATCH_SIZE).map((f) => f.file));
      }

      const totalBatches = chunks.length;
      setUploadProgress({
        current: 0,
        total: filesToProcess.length,
        currentBatch: 0,
        totalBatches,
      });

      const allResults: Batch[] = [];
      let processedCount = 0;

      // Process each chunk sequentially
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        
        setUploadProgress({
          current: processedCount,
          total: filesToProcess.length,
          currentBatch: i + 1,
          totalBatches,
        });

        const formData = new FormData();
        chunk.forEach((file) => {
          formData.append('file', file);
        });

        // eslint-disable-next-line no-await-in-loop
        const { data: batchResult, error } = await postBatch({
          formData,
          organizationId,
        });

        if (error) {
          toast({
            variant: 'destructive',
            title: `Batch ${i + 1} Failed`,
            description:
              'data' in error && typeof error.data === 'object' && error.data
                ? (error.data as ErrorResponse).error || 'Failed to process batch'
                : 'Failed to process batch',
          });
          // Continue with next batch even if one fails
          continue;
        }

        if (batchResult) {
          allResults.push(batchResult);
          processedCount += chunk.length;
        }
      }

      if (allResults.length > 0) {
        setCompletedBatches((prevBatches) => [...allResults, ...prevBatches]);
        toast({
          title: 'Processing Completed',
          description: `Successfully processed ${allResults.length} batch(es) with ${processedCount} file(s).`,
        });
      }

      // Remove processed files (keep skipped files for reference)
      setFiles((prevFiles) => prevFiles.filter((f) => f.skipped));
    } catch (e) {
      logger.error(e instanceof Error ? e.message : 'Failed to process batch');
      toast({
        variant: 'destructive',
        title: 'Processing Failed',
        description: e instanceof Error ? e.message : 'Failed to process batch',
      });
    } finally {
      processingRef.current = false;
      setIsPosting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8">
      <FileUploader isProcessing={isPosting} onFilesAdded={handleFilesAdded} />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Current Batch</h2>
              {uploadProgress && (
                <p className="text-sm text-muted-foreground mt-1">
                  Processing batch {uploadProgress.currentBatch} of {uploadProgress.totalBatches} 
                  ({uploadProgress.current} of {uploadProgress.total} files)
                </p>
              )}
            </div>
            <Button
              onClick={handleProcessBatch}
              disabled={files.length === 0 || isPosting}
              variant="primary"
            >
              {isPosting
                ? uploadProgress
                  ? `Processing Batch ${uploadProgress.currentBatch}/${uploadProgress.totalBatches}...`
                  : 'Processing...'
                : 'Process Batch'}
            </Button>
          </div>
          {uploadProgress && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
          <FileList
            isProcessing={isPosting}
            files={files}
            onRemove={handleRemoveFile}
          />
        </div>
      )}

      {isLoading && <CvBatchLoader />}
      {error && <p>Error fetching batches: </p>}
      {completedBatches.length > 0 && (
        <CompletedBatches batches={completedBatches} />
      )}
    </div>
  );
}

export default withAuthGuard(CVBatchProcessor, {
  requiredRoles: ['admin', 'hr'],
  fallbackPath: '/dashboard',
  checkAllowance: false,
  allowAuthenticated: true,
});
