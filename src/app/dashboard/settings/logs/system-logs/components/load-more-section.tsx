import { Button } from "@/components/ui/button";
import { ArrowDown, Loader2 } from "lucide-react";

interface LoadMoreSectionProps {
  isLoading: boolean;
  onLoadMore: () => void;
  currentCount: number;
  totalCount: number;
}

export function LoadMoreSection({
  isLoading,
  onLoadMore,
  currentCount,
  totalCount,
}: LoadMoreSectionProps) {
  return (
    <div className="mt-2 flex flex-col items-center justify-center gap-2 pb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadMore}
        disabled={isLoading}
        className="min-w-[140px] gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </>
        ) : (
          <>
            <ArrowDown className="h-4 w-4" /> Load More Logs
          </>
        )}
      </Button>

      <div className="text-xs italic text-muted-foreground/50">
        Showing {currentCount.toLocaleString()} lines (Total:{' '}
        {totalCount.toLocaleString()})
      </div>
    </div>
  );
}
