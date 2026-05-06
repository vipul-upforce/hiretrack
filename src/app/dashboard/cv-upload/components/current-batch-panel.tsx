'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileList } from './file-list';
import type { FileWithPreview } from './cv-batch-processor';

interface UploadProgress {
  current: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  completedBatches: number;
}

interface CurrentBatchPanelProps {
  files: FileWithPreview[];
  isPosting: boolean;
  hasSelectableFiles: boolean;
  selectedCount: number;
  selectableCount: number;
  allSelected: boolean;
  uploadProgress: UploadProgress | null;
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
  isPosting,
  hasSelectableFiles,
  selectedCount,
  selectableCount,
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
  if (files.length === 0) {
    return null;
  }

  const fileProgressPercent = uploadProgress
    ? Math.min(
      100,
      Math.round((uploadProgress.current / Math.max(uploadProgress.total, 1)) * 100),
    )
    : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Current Batch</h2>
          {hasSelectableFiles && (
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCount}
              {' '}
              of
              {' '}
              {selectableCount}
              {' '}
              selected
            </p>
          )}
          {uploadProgress && (
            <div className="mt-2 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                Batches done:
                {' '}
                {uploadProgress.completedBatches}
                /
                {uploadProgress.totalBatches}
              </p>
              {/* <Progress
                value={batchProgressPercent}
                className="h-2 w-full max-w-xs"
                aria-label="Batch processing progress"
              /> */}
              <p className="flex items-center gap-2">
                Files processed:
                {' '}
                {uploadProgress.current}
                /
                {uploadProgress.total}
                {' '}
                ({fileProgressPercent}%)
              </p>
              {/* <Progress
                value={fileProgressPercent}
                className="h-2 w-full max-w-xs"
                aria-label="CV processing progress"
              /> */}
            </div>
          )}

        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-2 rounded-md border px-3 py-2">
            <Switch
              id="deferred-processing"
              checked={processingMode === 'deferred'}
              disabled={isPosting}
              onCheckedChange={(checked) =>
                onProcessingModeChange(checked ? 'deferred' : 'immediate')
              }
            />
            <Label htmlFor="deferred-processing" className="text-xs text-muted-foreground">
              Store only (process later)
            </Label>
          </div>
          <Button
            onClick={onOpenActions}
            disabled={isPosting}
            variant="outline"
          >
            Batch Actions
          </Button>
          {hasSelectableFiles && (
            <Button
              onClick={onToggleSelectAll}
              disabled={isPosting}
              variant="secondary"
            >
              {allSelected ? 'Clear Selection' : 'Select All Files'}
            </Button>
          )}
          {hasSelectableFiles && (
            <Button
              onClick={onInvertSelection}
              disabled={isPosting}
              variant="outline"
            >
              Invert Selection
            </Button>
          )}
          <Button
            onClick={onRemoveSelected}
            disabled={isPosting || selectedCount === 0}
            variant="destructive"
          >
            Remove Selected Files
          </Button>
          <Button
            onClick={onProcessBatch}
            disabled={files.length === 0 || isPosting}
            variant="primary"
          >
            {isPosting && uploadProgress
              ? `Processing ${uploadProgress.completedBatches}/${uploadProgress.totalBatches} batches...`
              : isPosting
                ? 'Processing...'
                : 'Process Batch'}
          </Button>
        </div>
      </div>

      <Progress
        value={fileProgressPercent}
        className="h-2 w-full max-w-xs"
        aria-label="CV processing progress"
      />


      <FileList
        isProcessing={isPosting}
        files={files}
        onRemove={onRemoveFile}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}
