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

export const LogsTableSkeleton: React.FC = () => {
  const skeletonRows = Array.from({ length: 5 }).map((_, i) => (
    <TableRow
      key={i}
      className="border-b border-border hover:bg-muted/50 transition-colors"
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
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-4 py-3 font-semibold text-foreground text-left">
                  Updated At
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-foreground text-left">
                  Field
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-foreground text-left">
                  Previous Value
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-foreground text-left">
                  New Value
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-foreground text-left">
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
};
