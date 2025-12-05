import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton, Table } from '@mui/material';
import React from 'react';

function DesktopSkeletonHistroyLogs() {
  return (
    <div className="hidden md:block overflow-x-auto px-4">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <TableRow>
            <TableHead className="min-w-[200px] text-xs uppercase tracking-wider text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="min-w-[180px] text-xs uppercase tracking-wider text-muted-foreground">
              Candidate
            </TableHead>
            <TableHead className="min-w-[200px] text-xs uppercase tracking-wider text-muted-foreground">
              Job
            </TableHead>
            <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
              Updated by
            </TableHead>
            <TableHead className="text-right min-w-[100px] text-xs uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 20 }).map((_, idx) => (
            <TableRow key={`skeleton-${idx}`} className="even:bg-muted/30">
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-3 w-[80%]" />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[70%]" />
                  <Skeleton className="h-3 w-[50%]" />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[50%]" />
                  <Skeleton className="h-3 w-[70%]" />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[40%]" />
                  <Skeleton className="h-3 w-[30%]" />
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[50%]" />
                  <Skeleton className="h-3 w-[70%]" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default DesktopSkeletonHistroyLogs;
