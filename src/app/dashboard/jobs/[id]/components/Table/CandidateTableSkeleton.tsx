'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface CandidateTableSkeletonProps {
  visibleColumns: Record<string, boolean>;
}

export function CandidateTableSkeleton({ visibleColumns }: CandidateTableSkeletonProps) {
  // Create 20 rows of skeleton
  const rows = Array.from({ length: 20 });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black rounded-md border border-gray-200 dark:border-gray-800">
      <div className="flex-1 overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-white dark:bg-black z-20 shadow-sm">
            <TableRow className="hover:bg-transparent border-b">
              {visibleColumns.name && <TableHead className="w-[300px]"><Skeleton className="h-4 w-32" /></TableHead>}
              {visibleColumns.status && <TableHead className="w-[140px]"><Skeleton className="h-4 w-20" /></TableHead>}
              {visibleColumns.appliedDate && <TableHead className="w-[120px]"><Skeleton className="h-4 w-20" /></TableHead>}
              {visibleColumns.skills && <TableHead className="min-w-[150px]"><Skeleton className="h-4 w-24" /></TableHead>}
              {visibleColumns.currentCTC && <TableHead><Skeleton className="h-4 w-24" /></TableHead>}
              {visibleColumns.expectedCTC && <TableHead><Skeleton className="h-4 w-24" /></TableHead>}
              {visibleColumns.noticePeriod && <TableHead><Skeleton className="h-4 w-16" /></TableHead>}
              {visibleColumns.aiScore && <TableHead className="min-w-[400px]"><Skeleton className="h-4 w-40 mx-auto" /></TableHead>}
              <TableHead className="text-right sticky right-0 bg-white dark:bg-black z-20 w-[60px]"><Skeleton className="h-4 w-8 ml-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((_, i) => (
              <TableRow key={i} className="border-b h-[60px]">
                {visibleColumns.name && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.status && (
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                )}
                {visibleColumns.appliedDate && (
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                )}
                {visibleColumns.skills && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-12 rounded" />
                      <Skeleton className="h-5 w-14 rounded" />
                      <Skeleton className="h-5 w-10 rounded" />
                    </div>
                  </TableCell>
                )}
                {visibleColumns.currentCTC && (
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                )}
                {visibleColumns.expectedCTC && (
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                )}
                {visibleColumns.noticePeriod && (
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                )}
                {visibleColumns.aiScore && (
                  <TableCell>
                    <div className="flex items-center justify-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right sticky right-0 bg-white dark:bg-black">
                  <Skeleton className="h-8 w-8 ml-auto rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
