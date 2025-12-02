import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRightIcon } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface LogsPaginationProps {
  currentPage: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalLines: number;
  pageSize: number;
  currentOffset: number;
  currentLogCount: number;
}

export function LogsPagination({
  currentPage,
  setPage,
  totalLines,
  pageSize,
  currentOffset,
  currentLogCount,
}: LogsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalLines / pageSize));
  const isLastPage = currentOffset + currentLogCount >= totalLines;

  return (
    <div className="flex items-center justify-between gap-3 p-3 border-t bg-card/60">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage((p) => p + 1)}
        disabled={isLastPage}
        aria-label="Next page"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
