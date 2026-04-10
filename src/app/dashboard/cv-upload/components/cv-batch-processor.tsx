'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  usePostBatchMutation,
  useFetchBatchesQuery,
} from '@/lib/features/org/orgApi';
import { useToast } from '@/hooks/use-toast';
import withAuthGuard from '@/components/withAuthGuard';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import { FileUp } from 'lucide-react';
import { CompletedBatches } from './completed-batches';
import { FileList } from './file-list';
import { FileUploader } from './file-uploader';
import CvBatchLoader from './CvBatchLoader';
import { BatchOperationsPanel, type BatchOperations } from './batch-operations';

export type FileWithPreview = {
  id: string;
  file: File;
  preview?: string;
  error?: string;
  isZip?: boolean;
  skipped?: boolean;
  skipReason?: string;
  selected?: boolean;
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

function EmptyBatchesState() {
  return (
    <div className="flex min-h-full w-full items-center justify-center">
      <div className="w-full justify-center items-center flex h-[65vh] rounded-2xl border border-border/70 bg-background/80 px-6 py-12">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <FileUp className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            No batches processed yet
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload your CV files above and click Process Batch to create your
            first processing history.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CVBatchProcessor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [completedBatches, setCompletedBatches] = useState<Batch[]>([]);
  const [operations, setOperations] = useState<BatchOperations>({
    assignJob: false,
    jobId: '',
    updateStatus: false,
    status: '',
    addRemark: false,
    remark: '',
    isRemarkPrivate: true,
    remarkRating: null,
  });
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{
    total: number;
    selected: number;
    message: string;
  } | null>(null);
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

  const showNoBatchesState =
    !isLoading && !error && completedBatches.length === 0 && files.length === 0;

  const selectableFiles = files.filter((file) => !file.skipped);
  const selectedCount = selectableFiles.filter((file) => file.selected).length;
  const hasSelectableFiles = selectableFiles.length > 0;
  const allSelected =
    hasSelectableFiles && selectedCount === selectableFiles.length;

  const toggleFileSelection = useCallback((id: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === id ? { ...file, selected: !file.selected } : file,
      ),
    );
  }, []);

  const selectAllFiles = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.skipped ? file : { ...file, selected: true },
      ),
    );
  }, []);

  const clearSelection = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.skipped ? file : { ...file, selected: false },
      ),
    );
  }, []);

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
          selected: false,
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

  const handleProcessBatchInternal = async () => {
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

    const trimmedRemark = operations.remark.trim();
    const normalizedOperations: BatchOperations = {
      assignJob: operations.assignJob && operations.jobId.trim().length > 0,
      jobId: operations.jobId.trim(),
      updateStatus:
        operations.assignJob &&
        operations.updateStatus &&
        operations.status.trim().length > 0,
      status: operations.status.trim(),
      addRemark: operations.addRemark && trimmedRemark.length > 0,
      remark: trimmedRemark,
      isRemarkPrivate: operations.isRemarkPrivate,
      remarkRating: operations.remarkRating,
    };

    if (operations.assignJob && !normalizedOperations.jobId) {
      toast({
        variant: 'destructive',
        title: 'Job Required',
        description: 'Please select a job to assign before processing.',
      });
      return;
    }

    setIsPosting(true);
    processingRef.current = true;

    try {
      const organizationId = (user?.organizationId as string) || '';

      // Split files into chunks for batch processing
      const chunks: FileWithPreview[][] = [];
      for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
        chunks.push(filesToProcess.slice(i, i + BATCH_SIZE));
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
          formData.append('file', file.file);
          formData.append('fileId', file.id);
        });

        const selectedFileIds =
          normalizedOperations.assignJob || normalizedOperations.addRemark
            ? chunk.filter((file) => file.selected).map((file) => file.id)
            : [];
        formData.append('operations', JSON.stringify(normalizedOperations));
        formData.append('selectedFileIds', JSON.stringify(selectedFileIds));

        // eslint-disable-next-line no-await-in-loop
        const { data: batchResult, error: batchError } = await postBatch({
          formData,
          organizationId,
        });

        if (batchError) {
          toast({
            variant: 'destructive',
            title: `Batch ${i + 1} Failed`,
            description:
              'data' in batchError && typeof batchError.data === 'object' && batchError.data
                ? (batchError.data as ErrorResponse).error || 'Failed to process batch'
                : 'Failed to process batch',
          });
          // Continue with next batch even if one fails
          // eslint-disable-next-line no-continue
          continue;
        }

        if (batchResult) {
          allResults.push(batchResult);
          processedCount += chunk.length;
        }
      }

      if (allResults.length > 0) {
        // setCompletedBatches((prevBatches) => [...allResults, ...prevBatches]);
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

  const buildConfirmationMessage = () => {
    const hasAssign = operations.assignJob;
    const hasStatus = operations.assignJob && operations.updateStatus;
    const hasRemark = operations.addRemark;
    const enabledActions = [
      hasAssign ? 'Assign Job' : null,
      hasStatus ? 'Update Status' : null,
      hasRemark ? 'Add Remark' : null,
    ].filter(Boolean) as string[];

    const totalSelectable = selectableFiles.length;
    const selectedSelectable = selectedCount;

    if (enabledActions.length === 0) {
      return totalSelectable === 0
        ? 'This will process the batch and create candidates for all uploaded CVs.'
        : 'This will process the batch and create candidates for all uploaded CVs. No extra actions are selected.';
    }

    if (selectedSelectable === 0) {
      return `No CVs are selected, so these actions won’t be applied: ${enabledActions.join(
        ', ',
      )}. The batch will only create candidates.`;
    }

    if (selectedSelectable === totalSelectable) {
      return `Actions (${enabledActions.join(
        ', ',
      )}) will be applied to all ${totalSelectable} selected CVs.`;
    }

    return `Actions (${enabledActions.join(
      ', ',
    )}) will be applied to ${selectedSelectable} of ${totalSelectable} selected CVs. The rest will only create candidates.`;
  };

  const handleProcessBatch = () => {
    if (files.length === 0 || processingRef.current) return;
    const message = buildConfirmationMessage();
    setConfirmPayload({
      total: selectableFiles.length,
      selected: selectedCount,
      message,
    });
    setIsConfirmOpen(true);
  };

  return (
    <div className="flex min-h-full flex-col gap-8">
      <FileUploader isProcessing={isPosting} onFilesAdded={handleFilesAdded} />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Current Batch</h2>
              {hasSelectableFiles && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCount} of {selectableFiles.length} selected
                </p>
              )}
              {uploadProgress && (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  Processing batch {uploadProgress.currentBatch} of {uploadProgress.totalBatches}          
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsActionsOpen(true)}
                disabled={isPosting}
                variant="outline"
              >
                Batch Actions
              </Button>
              {hasSelectableFiles && (
                <Button
                  onClick={allSelected ? clearSelection : selectAllFiles}
                  disabled={isPosting}
                  variant="secondary"
                >
                  {allSelected ? 'Clear Selection' : 'Select All CVs'}
                </Button>
              )}
              <Button
                onClick={handleProcessBatch}
                disabled={files.length === 0 || isPosting}
                variant="primary"
              >
                {
                  (() => {
                    if (isPosting) {
                      if (uploadProgress) {
                        return `Processing Batch ${uploadProgress.currentBatch}/${uploadProgress.totalBatches}...`;
                      }
                      return 'Processing...';
                    }
                    return 'Process Batch';
                  })()
                }
              </Button>
            </div>
          </div>
       
          <FileList
            isProcessing={isPosting}
            files={files}
            onRemove={handleRemoveFile}
            onToggleSelect={toggleFileSelection}
          />
        </div>
      )}

      {isLoading && <CvBatchLoader />}
      {error && <p>Error fetching batches: </p>}
      {showNoBatchesState && <EmptyBatchesState />}
      {completedBatches.length > 0 && (
        <CompletedBatches batches={completedBatches} />
      )}

      <Dialog open={isActionsOpen} onOpenChange={setIsActionsOpen}>
        <DialogContent
          size="xl"
          className="flex max-h-[90vh] flex-col overflow-hidden p-0"
        >
          <DialogHeader className="border-0 px-6 py-3 pt-5">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Batch Actions
            </DialogTitle>
          </DialogHeader>

          <div className="border-b px-6 py-3">
            <BatchOperationsPanel
              value={operations}
              onChange={setOperations}
              disabled={isPosting}
              organizationId={(user?.organizationId as string) || ''}
              userRole={user?.role || ''}
              variant="toggles"
            />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 px-6 py-4">
            <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
              Actions apply only to the CVs you select in the list.
            </div>
            <BatchOperationsPanel
              value={operations}
              onChange={setOperations}
              disabled={isPosting}
              organizationId={(user?.organizationId as string) || ''}
              userRole={user?.role || ''}
              variant="sections"
            />
          </div>

          <DialogFooter className="border-t bg-background px-6 py-3">
            <div className="flex w-full items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsActionsOpen(false)}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="info"
                onClick={() => setIsActionsOpen(false)}
                className="min-w-[140px] font-medium shadow-sm transition-all hover:shadow-md"
              >
                Save Actions
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader>
            <DialogTitle className=" pt-3">
              Confirm Batch Processing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-6 py-2 text-sm text-muted-foreground">
            <p>{confirmPayload?.message}</p>
            <p>Do you want to continue?</p>
          </div>
          <DialogFooter className="border-t bg-background px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="info"
                onClick={() => {
                  setIsConfirmOpen(false);
                  handleProcessBatchInternal();
                }}
              >
                Confirm & Process
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuthGuard(CVBatchProcessor, {
  requiredRoles: ['admin', 'hr'],
  fallbackPath: '/dashboard',
  checkAllowance: false,
  allowAuthenticated: true,
});
