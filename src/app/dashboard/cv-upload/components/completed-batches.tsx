'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, EyeOff, Loader2, PlayCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onProcessPendingBatch: (batchId: string) => void;
  onProcessAllPending: () => void;
  onRetryFailedFile: (batchId: string, filename: string) => void;
  onRetryAllFailedInBatch: (batchId: string) => void;
  onRetryAllFailedAcrossBatches: (batchIds: string[]) => void;
  isRetryingFailed: boolean;
}

function AnimatedPendingBadge({
  count,
  delay = 2500,
}: {
  count: number;
  delay?: number;
}) {
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    setShowText(true);
    const timeout = window.setTimeout(() => {
      setShowText(false);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [count, delay]);

  return (
    <span className="absolute -right-2 -top-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold leading-4 text-amber-700 shadow-sm dark:bg-amber-900/40 dark:text-amber-300">
      <span>{count}</span>
      <span
        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${showText ? 'ml-1 max-w-16 opacity-100' : 'ml-0 max-w-0 opacity-0'
          }`}
      >
        pending
      </span>
    </span>
  );
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
  actionSlot,
}: {
  filename: string;
  status: string;
  error?: string;
  actionSlot?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{filename}</p>
          <p className="text-[11px] capitalize text-muted-foreground">{status}</p>
        </div>
        {actionSlot ?? null}
      </div>
      {error ? (
        <p className="line-clamp-2 text-[11px] text-red-600 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  );
}

function getDeferredBatchFileRows(batch: Batch): Array<{
  key: string;
  filename: string;
  status: string;
  error?: string;
}> {
  const pending = batch.pendingItems ?? [];
  if (pending.length > 0) {
    return pending.map((entry, index) => ({
      key: `${batch._id}-pending-${entry.file?.id ?? index}-${entry.filename || entry.file?.name || ''}`,
      filename: entry.filename || entry.file?.name || 'Unknown file',
      status: entry.status,
      error: entry.error,
    }));
  }
  return batch.items.map((item) => ({
    key: item._id,
    filename: item.filename,
    status: item.status,
    error: item.error,
  }));
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
  onProcessPendingBatch,
  onProcessAllPending,
  onRetryFailedFile,
  onRetryAllFailedInBatch,
  onRetryAllFailedAcrossBatches,
  isRetryingFailed,
}: CompletedBatchesProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

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

  if (!showHistory) {
    return (
      <section className="relative flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/50 p-6">
        <div className="relative inline-flex">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setShowHistory(true)}
          >
            {isLoading ? 'Loading…' : 'View completed batches'}
          </Button>
          {!isLoading && pendingDeferredBatchCount > 0 && (
            <AnimatedPendingBadge count={pendingDeferredBatchCount} delay={2000} />

          )}
        </div>
      </section>
    );
  }

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
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                  aria-label="Hide completed batches"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hide completed batches</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={onProcessAllPending}
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
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
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
                        <AccordionTrigger className="items-start gap-2 py-3 hover:no-underline [&[data-state=open]]:pb-2">
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
                              onProcessPendingBatch(batch._id);
                            }}
                          >
                            Process
                          </Button>
                        </AccordionTrigger>
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
                      <TableHead>Details</TableHead>
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
                          <TableCell>
                            {batch.items.length > 0 ? (
                              <div className="text-sm">
                                <div className="flex items-center gap-3">
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto p-0 text-primary"
                                    onClick={() =>
                                      setOpenBatchId((prev) =>
                                        prev === batch._id ? null : batch._id,
                                      )
                                    }
                                  >
                                    {openBatchId === batch._id
                                      ? 'Hide files'
                                      : `View files (${batch.items.length})`}
                                  </Button>
                                  {batch.items.some((item) => item.status === 'failed') && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isPipelineBusy}
                                      className="h-6 px-2 text-[11px]"
                                      onClick={() => onRetryAllFailedInBatch(batch._id)}
                                    >
                                      Retry All
                                    </Button>
                                  )}
                                </div>
                                {openBatchId === batch._id && (
                                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                                    {batch.items.map((item) => {
                                      const canRetryFailedItem = item.status === 'failed';
                                      return (
                                        <BatchFileListEntry
                                          key={item._id}
                                          filename={item.filename}
                                          status={item.status}
                                          error={item.error}
                                          actionSlot={
                                            canRetryFailedItem ? (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={isPipelineBusy}
                                                className="h-6 px-2 text-[11px]"
                                                onClick={() => onRetryFailedFile(batch._id, item.filename)}
                                              >
                                                Retry
                                              </Button>
                                            ) : undefined
                                          }
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No details</span>
                            )}
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
