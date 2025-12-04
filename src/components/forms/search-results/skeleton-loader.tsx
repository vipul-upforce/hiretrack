import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SearchResultsSkeletonLoader() {
  return (
    <Card className="overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Skeleton className="h-6 w-24" />
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Info Section */}
      <div className="px-4 py-2 bg-muted/20 border-b">
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(
              (row) => (
                <TableRow key={row} className="hover:bg-muted/50">
                  {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                    <TableCell key={col}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </Card>
  );
}
