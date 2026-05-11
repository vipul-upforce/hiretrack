'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FileRejection } from 'react-dropzone';
import {
  usePostBatchMutation,
  useFetchBatchesQuery,
  useProcessPendingCvBatchesMutation,
  useRetryFailedCvFilesMutation,
} from '@/lib/features/org/orgApi';
import { useToast } from '@/hooks/use-toast';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import withAuthGuard from '@/components/withAuthGuard';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import { useGetEvaluationConfigsQuery } from '@/lib/features/settings/aiApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CompletedBatches } from './completed-batches';
import { FileUploader } from './file-uploader';
import { type BatchOperations } from './batch-operations';
import {
  BatchActionsDialog,
  ConfirmProcessingDialog,
  ConfirmRemoveSelectedDialog,
} from './batch-processing-dialogs';
import { CurrentBatchPanel } from './current-batch-panel';

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
const BATCH_SIZE = 20; // Process 20 files at a time
const MAX_BATCH_PAYLOAD_BYTES = 8 * 1024 * 1024; // Keep below parser limits with multipart overhead
const DEFAULT_BATCH_OPERATIONS: BatchOperations = {
  processingMode: 'immediate',
  assignJob: false,
  jobId: '',
  updateStatus: false,
  status: '',
  addRemark: false,
  remark: '',
  isRemarkPrivate: true,
  remarkRating: null,
};

export type ProcessedItem = {
  filename: string;
  candidateId?: string;
  status: 'success' | 'failure' | 'failed' | 'pending';
  message?: string;
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
  processingMode?: 'immediate' | 'deferred';
  items: ProcessedItem[];
  pendingItems?: Array<{
    filename: string;
    status: 'pending' | 'processed' | 'failed';
    selected: boolean;
    error?: string;
    file: {
      id?: string;
      name: string;
      url: string;
      type: string;
      size: number;
    };
  }>;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

interface ErrorResponse {
  error?: string; 
}

const LEAVE_PROCESSING_MESSAGE = 'Batch processing is in progress. Leaving this page will stop processing remaining CVs. Do you want to continue?';

export function CVBatchProcessor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [completedBatches, setCompletedBatches] = useState<Batch[]>([]);
  const [operations, setOperations] = useState<BatchOperations>({
    ...DEFAULT_BATCH_OPERATIONS,
  });
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRemoveSelectedConfirmOpen, setIsRemoveSelectedConfirmOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const [confirmPayload, setConfirmPayload] = useState<{
    total: number;
    selected: number;
    message: string;
  } | null>(null);
  const processingRef = useRef(false);
  const [postBatch] = usePostBatchMutation();
  const [processPendingCvBatches] = useProcessPendingCvBatchesMutation();
  const [retryFailedCvFiles] = useRetryFailedCvFilesMutation();
  const [isPosting, setIsPosting] = useState(false);
  const [isProcessingPending, setIsProcessingPending] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
    completedBatches: number;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth || {});
  const { sanitizeFiles } = useSanitizeFiles();
  const { data: evaluationConfigData } = useGetEvaluationConfigsQuery();

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

  useEffect(() => {
    if (!isPosting) {
      return undefined;
    }

    const guardedUrl = window.location.href;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = LEAVE_PROCESSING_MESSAGE;
      return LEAVE_PROCESSING_MESSAGE;
    };

    const requestNavigationConfirmation = (targetUrl: string) => {
      setPendingNavigationUrl(targetUrl);
      setIsLeaveDialogOpen(true);
    };

    const handleDocumentClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      if (
        anchor.target === '_blank'
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      requestNavigationConfirmation(nextUrl.href);
    };

    const handlePopState = () => {
      const destinationUrl = window.location.href;
      window.history.pushState(null, '', guardedUrl);
      requestNavigationConfirmation(destinationUrl);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClickCapture, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClickCapture, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isPosting]);

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

  const invertSelection = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.skipped ? file : { ...file, selected: !file.selected },
      ),
    );
  }, []);

  const removeSelectedFiles = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.filter((file) => file.skipped || !file.selected),
    );
  }, []);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const sanitizedFiles = sanitizeFiles(newFiles);
    const processedFiles: FileWithPreview[] = [];
    const skippedFiles: FileWithPreview[] = [];

    sanitizedFiles.forEach((file) => {
      const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
      const maxSize = MAX_FILE_SIZE;
      const sizeLabel = '10MB';

      if (!isZip && file.size > maxSize) {
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
          selected: true,
        });
      }
    });

    if (skippedFiles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Some Files Skipped',
        description: `${skippedFiles.length} file(s) were skipped because PDF size exceeded 10MB.`,
      });
    }

    setFiles((prevFiles) => {
      const existingFiles = prevFiles.map((file) =>
        file.skipped ? file : { ...file, selected: true },
      );
      return [...existingFiles, ...processedFiles, ...skippedFiles];
    });

    if (processedFiles.length > 0) {
      // Start each newly dropped batch with clean post-process settings.
      setOperations({ ...DEFAULT_BATCH_OPERATIONS });
      setIsActionsOpen(true);
    }
  }, [sanitizeFiles, toast]);

  const handleFilesRejected = useCallback((rejections: FileRejection[]) => {
    if (rejections.length === 0) {
      return;
    }

    const skippedFromRejections: FileWithPreview[] = rejections.map((rejection) => ({
      id: crypto.randomUUID(),
      file: rejection.file,
      isZip: rejection.file.type === 'application/zip' || rejection.file.name.endsWith('.zip'),
      skipped: true,
      skipReason: rejection.errors.map((error) => error.message).join(' '),
    }));

    setFiles((prevFiles) => [...prevFiles, ...skippedFromRejections]);
    toast({
      variant: 'destructive',
      title: 'Some Files Rejected',
      description: `${rejections.length} file(s) were rejected because they did not match the supported format or constraints.`,
    });
  }, [toast]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }, []);

  const handleProcessBatchInternal = async (
    operationsOverride?: BatchOperations,
  ) => {
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

    const sourceOperations = operationsOverride ?? operations;
    const trimmedRemark = sourceOperations.remark.trim();
    const normalizedOperations: BatchOperations = {
      processingMode: sourceOperations.processingMode,
      assignJob: sourceOperations.assignJob && sourceOperations.jobId.trim().length > 0,
      jobId: sourceOperations.jobId.trim(),
      updateStatus:
        sourceOperations.assignJob &&
        sourceOperations.updateStatus &&
        sourceOperations.status.trim().length > 0,
      status: sourceOperations.status.trim(),
      addRemark: sourceOperations.addRemark && trimmedRemark.length > 0,
      remark: trimmedRemark,
      isRemarkPrivate: sourceOperations.isRemarkPrivate,
      remarkRating: sourceOperations.remarkRating,
    };

    if (sourceOperations.assignJob && !normalizedOperations.jobId) {
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

      // Split files into chunks by both count and payload size.
      // This prevents multipart/form-data requests from crossing parser body limits.
      const chunks: FileWithPreview[][] = [];
      let currentChunk: FileWithPreview[] = [];
      let currentChunkBytes = 0;
      for (const file of filesToProcess) {
        const fileSize = file.file.size || 0;
        const wouldExceedCount = currentChunk.length >= BATCH_SIZE;
        const wouldExceedBytes =
          currentChunkBytes > 0
          && currentChunkBytes + fileSize > MAX_BATCH_PAYLOAD_BYTES;

        if (wouldExceedCount || wouldExceedBytes) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentChunkBytes = 0;
        }

        currentChunk.push(file);
        currentChunkBytes += fileSize;
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      const totalBatches = chunks.length;
      setUploadProgress({
        current: 0,
        total: filesToProcess.length,
        currentBatch: 0,
        totalBatches,
        completedBatches: 0,
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
          completedBatches: i,
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
          title:
            normalizedOperations.processingMode === 'deferred'
              ? 'Files Stored'
              : 'Processing Completed',
          description:
            normalizedOperations.processingMode === 'deferred'
              ? `Stored ${processedCount} file(s) in ${allResults.length} deferred batch(es).`
              : `Successfully processed ${allResults.length} batch(es) with ${processedCount} file(s).`,
        });
      }

      // Remove processed files (keep skipped files for reference)
      setFiles((prevFiles) => prevFiles.filter((f) => f.skipped));
      setOperations({ ...DEFAULT_BATCH_OPERATIONS });
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
        : operations.processingMode === 'deferred'
          ? 'This will store all uploaded CVs for later processing. No extra actions are selected.'
          : 'This will process the batch and create candidates for all uploaded CVs. No extra actions are selected.';
    }

    if (selectedSelectable === 0) {
      return `No CVs are selected, so these actions won’t be applied: ${enabledActions.join(
        ', ',
      )}. The batch will only ${operations.processingMode === 'deferred' ? 'store CVs for later' : 'create candidates'}.`;
    }

    if (selectedSelectable === totalSelectable) {
      return `${operations.processingMode === 'deferred' ? 'Saved actions' : 'Actions'} (${enabledActions.join(
        ', ',
      )}) will be applied to all ${totalSelectable} selected CVs ${operations.processingMode === 'deferred' ? 'when processing later' : ''}.`;
    }

    return `${operations.processingMode === 'deferred' ? 'Saved actions' : 'Actions'} (${enabledActions.join(
      ', ',
    )}) will be applied to ${selectedSelectable} of ${totalSelectable} selected CVs. The rest will only ${operations.processingMode === 'deferred' ? 'store CVs for later processing' : 'create candidates'}.`;
  };

  const handleProcessPendingNow = async (batchId?: string) => {
    if (!user?.organizationId || isPosting || isProcessingPending) {
      return;
    }
    setIsProcessingPending(true);
    try {
      const response = await processPendingCvBatches({
        organizationId: user.organizationId as string,
        batchId,
      }).unwrap();
      toast({
        title: 'Pending Processing Triggered',
        description:
          response?.processedBatches && response.processedBatches > 0
            ? `Processed ${response.processedBatches} pending batch(es).`
            : 'No pending deferred batches found.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Process Pending Batches',
        description: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsProcessingPending(false);
    }
  };

  const handleRetryFailedFile = async (batchId: string, filename?: string) => {
    if (!user?.organizationId || isPosting || isProcessingPending || isRetryingFailed) {
      return;
    }
    setIsRetryingFailed(true);
    try {
      const response = await retryFailedCvFiles({
        organizationId: user.organizationId as string,
        batchId,
        filename,
      }).unwrap();
      toast({
        title: 'Retry Completed',
        description:
          response?.retried && response.retried > 0
            ? filename
              ? `Retried ${response.retried} failed file(s): ${response.processed} processed, ${response.failed} still failed.`
              : `Retried all failed files in batch: ${response.processed} processed, ${response.failed} still failed.`
            : filename
              ? 'No retriable failed deferred files were found.'
              : 'No retriable failed files found in this batch.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Retry Failed',
        description: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleRetryAllFailedAcrossBatches = async (batchIds: string[]) => {
    if (!user?.organizationId || isPosting || isProcessingPending || isRetryingFailed) {
      return;
    }

    const uniqueBatchIds = [...new Set(batchIds)];
    if (uniqueBatchIds.length === 0) {
      toast({
        title: 'No Failed Files',
        description: 'No retriable failed files were found.',
      });
      return;
    }

    setIsRetryingFailed(true);
    let retried = 0;
    let processed = 0;
    let failed = 0;

    try {
      for (const batchId of uniqueBatchIds) {
        // eslint-disable-next-line no-await-in-loop
        const response = await retryFailedCvFiles({
          organizationId: user.organizationId as string,
          batchId,
        }).unwrap();
        retried += response.retried ?? 0;
        processed += response.processed ?? 0;
        failed += response.failed ?? 0;
      }

      toast({
        title: 'Retry All Completed',
        description:
          retried > 0
            ? `Retried ${retried} failed file(s) across ${uniqueBatchIds.length} batch(es): ${processed} processed, ${failed} still failed.`
            : 'No retriable failed files were found.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Retry All Failed',
        description: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsRetryingFailed(false);
    }
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
      <FileUploader
        isProcessing={isPosting}
        onFilesAdded={handleFilesAdded}
        onFilesRejected={handleFilesRejected}
        maxPdfPages={evaluationConfigData?.evaluationConfig?.maxPdfPages ?? 0}
      />

      <CurrentBatchPanel
        files={files}
        isPosting={isPosting}
        processingMode={operations.processingMode}
        hasSelectableFiles={hasSelectableFiles}
        selectedCount={selectedCount}
        selectableCount={selectableFiles.length}
        batchSize={BATCH_SIZE}
        allSelected={allSelected}
        uploadProgress={uploadProgress}
        onOpenActions={() => setIsActionsOpen(true)}
        onProcessingModeChange={(mode) =>
          setOperations((prev) => ({ ...prev, processingMode: mode }))
        }
        onToggleSelectAll={allSelected ? clearSelection : selectAllFiles}
        onInvertSelection={invertSelection}
        onRemoveSelected={() => setIsRemoveSelectedConfirmOpen(true)}
        onProcessBatch={handleProcessBatch}
        onRemoveFile={handleRemoveFile}
        onToggleSelect={toggleFileSelection}
      />

      {error && <p>Error fetching batches: </p>}
      <CompletedBatches
        batches={completedBatches}
        isLoading={isLoading}
        isProcessingPending={isProcessingPending}
        onProcessPendingBatch={(batchId) => handleProcessPendingNow(batchId)}
        onProcessAllPending={() => handleProcessPendingNow()}
        onRetryFailedFile={handleRetryFailedFile}
        onRetryAllFailedInBatch={(batchId) => handleRetryFailedFile(batchId)}
        onRetryAllFailedAcrossBatches={handleRetryAllFailedAcrossBatches}
        isRetryingFailed={isRetryingFailed}
      />

      <BatchActionsDialog
        open={isActionsOpen}
        onOpenChange={setIsActionsOpen}
        operations={operations}
        onOperationsChange={setOperations}
        onApplyAndProcess={(nextOperations) => {
          setOperations(nextOperations);
          handleProcessBatchInternal(nextOperations);
        }}
        isPosting={isPosting}
        organizationId={(user?.organizationId as string) || ''}
        userRole={user?.role || ''}
      />

      <ConfirmProcessingDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        payload={confirmPayload}
        onConfirm={() => {
          setIsConfirmOpen(false);
          handleProcessBatchInternal();
        }}
      />

      <ConfirmRemoveSelectedDialog
        open={isRemoveSelectedConfirmOpen}
        onOpenChange={setIsRemoveSelectedConfirmOpen}
        selectedCount={selectedCount}
        onConfirm={() => {
          removeSelectedFiles();
          setIsRemoveSelectedConfirmOpen(false);
        }}
      />

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader>
            <DialogTitle className="pt-3">
              Leave CV Upload?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-6 py-2 text-sm text-muted-foreground">
            <p>
              Batch processing is in progress. If you leave this page now, the
              remaining CVs will not be processed.
            </p>
            <p>Do you still want to continue?</p>
          </div>
          <DialogFooter className="border-t bg-background px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLeaveDialogOpen(false);
                  setPendingNavigationUrl(null);
                }}
              >
                Stay on Page
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const url = pendingNavigationUrl;
                  setIsLeaveDialogOpen(false);
                  setPendingNavigationUrl(null);
                  if (url) {
                    window.location.assign(url);
                  }
                }}
              >
                Leave Page
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
