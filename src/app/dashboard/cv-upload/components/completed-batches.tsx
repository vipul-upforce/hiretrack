'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileStack, Loader2, PlayCircle, RotateCcw, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useFetchJobByIdQuery } from '@/lib/features/job/jobApi';
import { resolveItemParseLabel } from '../batch-parse-display';
import { dedupeBatchItemsByFilename } from '@/lib/cv-upload/batch-item-dedupe';
import type { Batch } from './cv-batch-processor';

function isDeferredPendingBatch(batch: Batch): boolean {
  return batch.status === 'pending' && batch.processingMode === 'deferred';
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

interface CompletedBatchesProps {
  batches: Batch[];
  isLoading: boolean;
  /** Upload, deferred process, or retry in progress — disables conflicting actions */
  isPipelineBusy: boolean;
  isProcessingPending: boolean;
  onProcessPending: (options?: { batchId?: string; batchIds?: string[] }) => void;
  onRetryFailedFile: (batchId: string, filename: string) => void;
  onRetryAllFailedInBatch: (batchId: string) => void;
  onRetryAllFailedAcrossBatches: (batchIds: string[]) => void;
  isRetryingFailed: boolean;
}

function getBatchDate(batch: Batch): Date {
  return new Date(batch.completedAt ?? batch.createdAt);
}

function inDateRange(date: Date, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) {
    return true;
  }

  const timestamp = date.getTime();
  const fromTimestamp = startDate
    ? new Date(startDate).setHours(0, 0, 0, 0)
    : Number.NEGATIVE_INFINITY;
  const toTimestamp = endDate
    ? new Date(endDate).setHours(23, 59, 59, 999)
    : Number.POSITIVE_INFINITY;
  return timestamp >= fromTimestamp && timestamp <= toTimestamp;
}

/** File row UI shared by the completed-batches table and the deferred-uploads panel. */
function BatchFileListEntry({
  filename,
  status,
  error,
  parseProviderLabel,
  fileUrl,
  actionSlot,
}: {
  filename: string;
  status: string;
  error?: string;
  parseProviderLabel?: string;
  fileUrl?: string;
  actionSlot?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{filename}</p>
          <p className="text-[11px] capitalize text-muted-foreground">{status}</p>
          {parseProviderLabel ? (
            <Badge variant="secondary" className="mt-1 max-w-full truncate text-[10px] font-normal">
              {parseProviderLabel}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Open
            </a>
          ) : null}
          {actionSlot ?? null}
        </div>
      </div>
      {error ? (
        <p className="line-clamp-2 text-[11px] text-red-600 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  );
}

function batchHasActionSummary(snap: Batch['operationsSnapshot'] | undefined): boolean {
  if (!snap) {
    return false;
  }
  if (snap.assignJob && !!snap.jobId?.trim()) {
    return true;
  }
  if (snap.assignJob && snap.updateStatus && !!snap.status?.trim()) {
    return true;
  }
  if (snap.addRemark && !!snap.remark?.trim()) {
    return true;
  }
  return false;
}

/** Inner panel: job / status / remark (popover or hover surface). */
function BatchActionsPopoverPanel({ batch }: { batch: Batch }) {
  const snap = batch.operationsSnapshot;
  const jobId = snap?.assignJob && snap.jobId?.trim() ? snap.jobId.trim() : '';
  const { data: job, isFetching } = useFetchJobByIdQuery(jobId, {
    skip: !jobId,
  });

  if (!snap || !batchHasActionSummary(snap)) {
    return null;
  }

  const showJob = !!(snap.assignJob && snap.jobId?.trim());
  const showStatus = !!(snap.assignJob && snap.updateStatus && snap.status?.trim());
  const showRemark = !!(snap.addRemark && snap.remark?.trim());

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Saved batch actions
      </p>
      <dl className="space-y-3 text-sm">
        {showJob ? (
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">Job to assign</dt>
            <dd className="break-words font-medium leading-snug text-foreground">
              {isFetching ? 'Loading…' : (job?.title?.trim() || jobId)}
            </dd>
          </div>
        ) : null}
        {showStatus ? (
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="capitalize leading-snug text-foreground">{snap.status}</dd>
          </div>
        ) : null}
        {showRemark ? (
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">Remark</dt>
            <dd className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/50 bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-foreground">
              {snap.remark}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/**
 * Compact trigger + popover. Opens on hover (with delay before close so the pointer can move into the panel).
 * Tap/click toggles for touch devices.
 */
function BatchActionsPopover({ batch }: { batch: Batch }) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 240);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  if (!batchHasActionSummary(batch.operationsSnapshot)) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          aria-label="View saved batch actions: job, status, remark"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
        >
          <ScrollText className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] border-border/80 p-4 shadow-lg"
        align="start"
        side="bottom"
        sideOffset={6}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <BatchActionsPopoverPanel batch={batch} />
      </PopoverContent>
    </Popover>
  );
}

type BatchFileRow = {
  key: string;
  filename: string;
  status: string;
  error?: string;
  parseProviderLabel?: string;
  fileUrl?: string;
};

function buildStoredFileUrlByFilename(batch: Batch): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const pendingItem of batch.pendingItems ?? []) {
    const key = pendingItem.filename || pendingItem.file?.name || '';
    const url = pendingItem.file?.url || '';
    if (key && url) {
      lookup.set(key, url);
    }
  }
  return lookup;
}

function getDeferredBatchFileRows(batch: Batch): BatchFileRow[] {
  const pending = batch.pendingItems ?? [];
  if (pending.length > 0) {
    return pending.map((entry, index) => ({
      key: `${batch._id}-pending-${entry.file?.id ?? index}-${entry.filename || entry.file?.name || ''}`,
      filename: entry.filename || entry.file?.name || 'Unknown file',
      status: entry.status,
      error: entry.error,
      fileUrl: entry.file?.url,
    }));
  }
  return batch.items.map((item) => ({
    key: item._id,
    filename: item.filename,
    status: item.status,
    error: item.error,
  }));
}

/** Processed items when present; otherwise deferred / pending file rows. */
function getBatchFileRowsForDisplay(batch: Batch): BatchFileRow[] {
  const storedFileUrlByFilename = buildStoredFileUrlByFilename(batch);
  if (batch.items.length > 0) {
    return dedupeBatchItemsByFilename(batch.items).map((item) => ({
      key: item._id,
      filename: item.filename,
      status: item.status,
      error: item.error,
      parseProviderLabel: resolveItemParseLabel(item),
      fileUrl: storedFileUrlByFilename.get(item.filename),
    }));
  }
  return getDeferredBatchFileRows(batch);
}

/**
 * Hover (or click) to show the full file list in a floating panel with room to scroll.
 */
function BatchResumeFilesHoverPopover({
  batch,
  isPipelineBusy,
  onRetryFailedFile,
  onRetryAllFailedInBatch,
}: {
  batch: Batch;
  isPipelineBusy: boolean;
  onRetryFailedFile: (batchId: string, filename: string) => void;
  onRetryAllFailedInBatch: (batchId: string) => void;
}) {
  const rows = getBatchFileRowsForDisplay(batch);
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 280);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  if (rows.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const hasFailed = rows.some((row) => row.status === 'failed');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2 text-xs tabular-nums"
          aria-label={`View ${rows.length} resume file(s) in this batch`}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
        >
          <FileStack className="h-3.5 w-3.5 shrink-0" />
          {rows.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(36rem,calc(100vw-1.5rem))] border-border/80 p-0 shadow-lg"
        align="start"
        side="bottom"
        sideOffset={8}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b border-border/60 bg-muted/25 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Resume files in this batch
              {' '}
              <span className="font-medium text-foreground tabular-nums">
                (
                {rows.length}
                )
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Parsing provider is shown under each file when available.
            </p>
            {hasFailed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPipelineBusy}
                className="h-7 text-[11px]"
                onClick={() => onRetryAllFailedInBatch(batch._id)}
              >
                Retry all failed
              </Button>
            ) : null}
          </div>
        </div>
        <div className="max-h-[min(70vh,28rem)] space-y-2 overflow-y-auto p-4">
          {rows.map((row) => {
            const canRetry = row.status === 'failed';
            return (
              <BatchFileListEntry
                key={row.key}
                filename={row.filename}
                status={row.status}
                error={row.error}
                parseProviderLabel={row.parseProviderLabel}
                fileUrl={row.fileUrl}
                actionSlot={
                  canRetry ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPipelineBusy}
                      className="h-6 px-2 text-[11px]"
                      onClick={() => onRetryFailedFile(batch._id, row.filename)}
                    >
                      Retry
                    </Button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getStatusStyles(status: Batch['status']): string {
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (status === 'failed') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }

  if (status === 'processing') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

export function CompletedBatches({
  batches,
  isLoading,
  isPipelineBusy,
  isProcessingPending,
  onProcessPending,
  onRetryFailedFile,
  onRetryAllFailedInBatch,
  onRetryAllFailedAcrossBatches,
  isRetryingFailed,
}: CompletedBatchesProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [selectedDeferredBatchIds, setSelectedDeferredBatchIds] = useState<
    Set<string>
  >(() => new Set());

  const sortedBatches = useMemo(
    () =>
      [...batches].sort(
        (a, b) => getBatchDate(b).getTime() - getBatchDate(a).getTime(),
      ),
    [batches],
  );

  const pendingDeferredBatches = useMemo(
    () => sortedBatches.filter(isDeferredPendingBatch),
    [sortedBatches],
  );
  const pendingDeferredBatchCount = pendingDeferredBatches.length;
  const selectedDeferredCount = selectedDeferredBatchIds.size;
  const allDeferredSelected =
    pendingDeferredBatchCount > 0
    && selectedDeferredCount === pendingDeferredBatchCount;

  useEffect(() => {
    const validIds = new Set(pendingDeferredBatches.map((batch) => batch._id));
    setSelectedDeferredBatchIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) {
        return prev;
      }
      return next;
    });
  }, [pendingDeferredBatches]);

  const toggleDeferredBatchSelection = useCallback((batchId: string) => {
    setSelectedDeferredBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllDeferredBatches = useCallback(() => {
    if (allDeferredSelected) {
      setSelectedDeferredBatchIds(new Set());
      return;
    }
    setSelectedDeferredBatchIds(
      new Set(pendingDeferredBatches.map((batch) => batch._id)),
    );
  }, [allDeferredSelected, pendingDeferredBatches]);

  /** Batches shown in the completed-history table (excludes deferred upload queue). */
  const historySourceBatches = useMemo(
    () => sortedBatches.filter((batch) => !isDeferredPendingBatch(batch)),
    [sortedBatches],
  );

  const filteredHistoryBatches = useMemo(
    () =>
      historySourceBatches.filter((batch) =>
        inDateRange(getBatchDate(batch), startDate, endDate),
      ),
    [historySourceBatches, startDate, endDate],
  );
  const retryableFailedBatchIds = useMemo(
    () =>
      sortedBatches
        .filter((batch) => batch.items.some((item) => item.status === 'failed'))
        .map((batch) => batch._id),
    [sortedBatches],
  );
  const hasRetryableFailedBatches = retryableFailedBatchIds.length > 0;

  const totalPages = Math.max(1, Math.ceil(filteredHistoryBatches.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedHistoryBatches = filteredHistoryBatches.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const onPageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) {
      return;
    }
    setCurrentPage(nextPage);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Completed batches</h2>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          {hasRetryableFailedBatches && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onRetryAllFailedAcrossBatches(retryableFailedBatchIds)}
                    disabled={isPipelineBusy}
                    aria-label="Retry all failed files across all batches"
                  >
                    {isRetryingFailed ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isRetryingFailed
                      ? 'Retrying failed files...'
                      : `Retry all failed files (${retryableFailedBatchIds.length} batches)`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        {pendingDeferredBatchCount > 0 && (
          <aside className="flex w-full shrink-0 flex-col lg:max-w-md lg:self-stretch">
            <Card className="flex min-h-[38rem] max-h-[min(90vh,52rem)] flex-col border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
                <div className="relative min-w-0 pr-8">
                  <CardTitle className="text-base font-semibold">Deferred uploads ({pendingDeferredBatchCount})</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stored; process when ready.
                  </p>

                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild> */}
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      onProcessPending({
                        batchIds: [...selectedDeferredBatchIds],
                      })
                    }
                    disabled={isPipelineBusy || selectedDeferredCount === 0}
                    aria-label="Process selected deferred batches"
                  >
                    {isProcessingPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-1 h-4 w-4" />
                    )}
                    Process selected ({selectedDeferredCount})
                  </Button>
                  {/* </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {selectedDeferredCount === 0
                            ? 'Select one or more batches'
                            : `Process ${selectedDeferredCount} selected batch(es)`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider> */}
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => onProcessPending()}
                          disabled={isPipelineBusy}
                          aria-label="Process all deferred batches"
                        >
                          {isProcessingPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-1 h-4 w-4" />
                          )}
                          Process all
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isProcessingPending
                            ? 'Processing…'
                            : 'Process every deferred batch now'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
                <div className="mb-2 flex px-[9px] items-center gap-2 border-b border-border/50 py-2">
                  <Checkbox
                    checked={
                      allDeferredSelected
                        ? true
                        : selectedDeferredCount > 0
                          ? 'indeterminate'
                          : false
                    }
                    disabled={isPipelineBusy || pendingDeferredBatchCount === 0}
                    onCheckedChange={toggleSelectAllDeferredBatches}
                    aria-label="Select all deferred batches"
                  />
                  <span className="text-xs text-muted-foreground">
                    {allDeferredSelected
                      ? 'All selected'
                      : selectedDeferredCount > 0
                        ? `${selectedDeferredCount} selected`
                        : 'Select batches to process'}
                  </span>
                </div>
                <Accordion type="multiple" className="w-full rounded-md border border-border/50 bg-background/50">
                  {pendingDeferredBatches.map((batch) => {
                    const date = getBatchDate(batch);
                    const fileRows = getDeferredBatchFileRows(batch);
                    return (
                      <AccordionItem
                        key={batch._id}
                        value={batch._id}
                        className="border-b border-border/50 px-2 last:border-b-0"
                      >
                        <div className="flex w-full items-start gap-1">
                          <Checkbox
                            className="mt-3 shrink-0"
                            checked={selectedDeferredBatchIds.has(batch._id)}
                            disabled={isPipelineBusy}
                            onCheckedChange={() => toggleDeferredBatchSelection(batch._id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select batch from ${date.toLocaleString()}`}
                          />
                          <div className="min-w-0 flex-1">
                            <AccordionTrigger className="min-h-11 w-full items-start py-3 hover:no-underline [&[data-state=open]]:pb-2">
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-xs font-medium text-foreground">
                                  {date.toLocaleDateString()}
                                  {' '}
                                  ·
                                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {fileRows.length || batch.totalFiles}
                                  {' '}
                                  file
                                  {(fileRows.length || batch.totalFiles) === 1 ? '' : 's'}
                                </p>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 py-2">
                            <BatchResumeFilesHoverPopover
                              batch={batch}
                              isPipelineBusy={isPipelineBusy}
                              onRetryFailedFile={onRetryFailedFile}
                              onRetryAllFailedInBatch={onRetryAllFailedInBatch}
                            />
                            <BatchActionsPopover batch={batch} />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={isPipelineBusy}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                onProcessPending({ batchId: batch._id });
                              }}
                            >
                              Process
                            </Button>
                          </div>
                        </div>
                        <AccordionContent className="pb-3 pt-0">
                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {fileRows.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground">No file list yet.</p>
                            ) : (
                              fileRows.map((row) => {
                                const canRetry = row.status === 'failed';
                                return (
                                  <BatchFileListEntry
                                    key={row.key}
                                    filename={row.filename}
                                    status={row.status}
                                    error={row.error}
                                    fileUrl={row.fileUrl}
                                    actionSlot={
                                      canRetry ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={isPipelineBusy}
                                          className="h-6 px-2 text-[11px]"
                                          onClick={() => onRetryFailedFile(batch._id, row.filename)}
                                        >
                                          Retry
                                        </Button>
                                      ) : undefined
                                    }
                                  />
                                );
                              })
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </aside>
        )}

        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Filter by completion date
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Start date</p>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-[170px]"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">End date</p>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setCurrentPage(1);
                  }}
                  min={startDate || undefined}
                  className="w-full sm:w-[170px]"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-secondary px-3 py-1 text-sm shadow-sm dark:bg-transparent sm:w-[120px]"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                disabled={!startDate && !endDate}
              >
                Clear
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="rounded-xl border border-border/60 p-6 text-center text-sm text-muted-foreground">
              Loading batches...
            </div>
          )}

          {!isLoading && filteredHistoryBatches.length === 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
              <Clock3 className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No completed batches match the selected date range.
              </p>
            </div>
          )}

          {!isLoading && filteredHistoryBatches.length > 0 && (
            <>
              <div className="overflow-hidden rounded-xl border border-border/70">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Success</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-14 text-center">
                        <span className="sr-only">Saved batch actions</span>
                      </TableHead>
                      <TableHead>Files</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistoryBatches.map((batch) => {
                      const date = getBatchDate(batch);
                      return (
                        <TableRow key={batch._id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {date.toLocaleDateString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {date.toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">{batch.totalFiles}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-300">
                            {batch.successCount}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600 dark:text-red-300">
                            {batch.failureCount}
                          </TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusStyles(batch.status)}`}>
                              {batch.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <div className="inline-flex justify-center">
                              <BatchActionsPopover batch={batch} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <BatchResumeFilesHoverPopover
                              batch={batch}
                              isPipelineBusy={isPipelineBusy}
                              onRetryFailedFile={onRetryFailedFile}
                              onRetryAllFailedInBatch={onRetryAllFailedInBatch}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing page
                    {' '}
                    {safePage}
                    {' '}
                    of
                    {' '}
                    {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(safePage - 1)}
                      disabled={safePage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(safePage + 1)}
                      disabled={safePage >= totalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
