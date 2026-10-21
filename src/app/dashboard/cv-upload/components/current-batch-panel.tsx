'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2,
  PlayCircle,
  Settings2,
  X,
} from 'lucide-react';
import { FileList } from './file-list';
import type { FileWithPreview, UploadProgressState } from './cv-batch-processor';

interface CurrentBatchPanelProps {
  files: FileWithPreview[];
  /** True while multipart upload, deferred batch processing, or failed-file retry is running */
  isPipelineBusy: boolean;
  hasSelectableFiles: boolean;
  selectedCount: number;
  selectableCount: number;
  batchSize: number;
  allSelected: boolean;
  uploadProgress: UploadProgressState | null;
  onOpenActions: () => void;
  processingMode: 'immediate' | 'deferred';
  onProcessingModeChange: (mode: 'immediate' | 'deferred') => void;
  onToggleSelectAll: () => void;
  onInvertSelection: () => void;
  onRemoveSelected: () => void;
  onProcessBatch: () => void;
  onRemoveFile: (id: string) => void;
  onToggleSelect: (id: string) => void;
}

export function CurrentBatchPanel({
  files,
  isPipelineBusy,
  hasSelectableFiles,
  selectedCount,
  selectableCount,
  batchSize,
  allSelected,
  uploadProgress,
  onOpenActions,
  processingMode,
  onProcessingModeChange,
  onToggleSelectAll,
  onInvertSelection,
  onRemoveSelected,
  onProcessBatch,
  onRemoveFile,
  onToggleSelect,
}: CurrentBatchPanelProps) {
  const isServerPhase =
    uploadProgress?.phase === 'server-deferred'
    || uploadProgress?.phase === 'server-retry';
  const isClientUploadPhase =
    uploadProgress?.phase === 'client-upload'
    || (!uploadProgress?.phase && uploadProgress && !isServerPhase);

  if (files.length === 0) {
    return null;
  }

  const fileProgressPercent =
    uploadProgress && !isServerPhase
      ? Math.min(
        100,
        Math.round((uploadProgress.current / Math.max(uploadProgress.total, 1)) * 100),
      )
      : 0;
  const estimatedBatchCount = hasSelectableFiles
    ? Math.ceil(selectableCount / Math.max(batchSize, 1))
    : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4 pb-6 shadow-sm md:p-5 h-[calc(100vh-200px)] overflow-y-auto">
      {/* <div className="flex flex-col gap-4 top-0 bg-background/80 z-10"> */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Current Upload Set</h2>
          {hasSelectableFiles && (
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCount}
              {' '}
              of
              {' '}
              {selectableCount}
              {' '}
              selected
              {' '}
              -
              {' '}
              Split into
              {' '}
              {estimatedBatchCount}
              {' '}
              batch
              {estimatedBatchCount === 1 ? '' : 'es'}
            </p>
          )}
          {uploadProgress && isClientUploadPhase && (
            <div className="mt-2 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                Batches done:
                {' '}
                {uploadProgress.completedBatches}
                /
                {uploadProgress.totalBatches}
              </p>
              <p className="flex items-center gap-2">
                Files processed:
                {' '}
                {uploadProgress.current}
                /
                {uploadProgress.total}
                {' '}
                (
                {fileProgressPercent}
                %)
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <Switch
              id="deferred-processing"
              checked={processingMode === 'deferred'}
              disabled={isPipelineBusy}
              onCheckedChange={(checked) =>
                onProcessingModeChange(checked ? 'deferred' : 'immediate')
              }
            />
            <Label htmlFor="deferred-processing" className="text-xs text-muted-foreground">
              Store only (process later)
            </Label>
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onOpenActions}
                    disabled={isPipelineBusy}
                    variant="outline"
                    size="icon"
                    aria-label="Batch actions"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Batch actions</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onProcessBatch}
                    disabled={files.length === 0 || isPipelineBusy}
                    variant="primary"
                    size="icon"
                    aria-label="Process batch"
                  >
                    {isPipelineBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isPipelineBusy && uploadProgress?.phase === 'client-upload'
                      ? `Uploading batch ${uploadProgress.completedBatches}/${uploadProgress.totalBatches}…`
                      : isPipelineBusy
                        ? 'Working…'
                        : 'Process batch'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <Progress
        value={fileProgressPercent}
        className="h-2 w-full max-w-xs"
        aria-label="CV processing progress"
      />

      {hasSelectableFiles && (
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected ? true : selectedCount > 0 ? 'indeterminate' : false}
              disabled={isPipelineBusy}
              onCheckedChange={() => {
                if (allSelected || selectedCount === 0) {
                  onToggleSelectAll();
                  return;
                }
                onInvertSelection();
              }}
              aria-label="Selection control"
            />
            <span className="text-xs text-muted-foreground">
              {allSelected
                ? 'All selected'
                : selectedCount > 0
                  ? 'Partial selection'
                  : 'None selected'}
            </span>

          </div>
          {selectedCount > 0 && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    className="mr-[14px] h-5 w-5 p-0"
                    onClick={onRemoveSelected}
                    disabled={isPipelineBusy}
                    variant="destructive"
                    size="default"
                    aria-label="Remove selected files"
                  >
                    <X className="h-3 w-3 w-[10px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove selected files</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      {/* </div> */}


      <div className="">
        <FileList
          isProcessing={isPipelineBusy}
          files={files}
          onRemove={onRemoveFile}
          onToggleSelect={onToggleSelect}
        />

      </div>




    </div>
  );
}
