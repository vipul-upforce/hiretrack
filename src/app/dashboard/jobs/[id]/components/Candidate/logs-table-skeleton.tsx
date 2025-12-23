import type React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function LogsTableSkeleton() {
  const skeletonRows = Array.from({ length: 5 }).map(() => (
    <TableRow
      key={Math.random()}
      className="border-b border-border transition-colors hover:bg-muted/50"
    >
      <TableCell className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-4 w-28" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                  Updated At
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                  Field
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                  Previous Value
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                  New Value
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                  Updated By
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{skeletonRows}</TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
