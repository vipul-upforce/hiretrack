'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Batch } from './cv-batch-processor';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

interface CompletedBatchesProps {
  batches: Batch[];
  isLoading: boolean;
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

export function CompletedBatches({ batches, isLoading }: CompletedBatchesProps) {
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

  const filteredBatches = useMemo(
    () => sortedBatches.filter((batch) => inDateRange(getBatchDate(batch), startDate, endDate)),
    [sortedBatches, startDate, endDate],
  );

  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBatches = filteredBatches.slice(
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
      <section className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/50 p-6">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setShowHistory(true)}
        >
          View Completed Batches
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Completed Batches</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review processing history with date filtering and pagination.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowHistory(false)}
        >
          Hide Completed Batches
        </Button>
      </div>
      <div className="mt-6 space-y-5">
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

          {!isLoading && filteredBatches.length === 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
              <Clock3 className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No batches found for the selected date range.
              </p>
            </div>
          )}

          {!isLoading && filteredBatches.length > 0 && (
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
                    {paginatedBatches.map((batch) => {
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
                                {openBatchId === batch._id && (
                                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                                    {batch.items.map((item) => (
                                      <div
                                        key={item._id}
                                        className="rounded-md border border-border/60 bg-muted/10 px-2 py-1"
                                      >
                                        <p className="truncate text-xs font-medium">{item.filename}</p>
                                        <p className="text-[11px] capitalize text-muted-foreground">
                                          {item.status}
                                        </p>
                                        {item.error && (
                                          <p className="line-clamp-2 text-[11px] text-red-600 dark:text-red-300">
                                            {item.error}
                                          </p>
                                        )}
                                      </div>
                                    ))}
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
    </section>
  );
}
