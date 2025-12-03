import { RefObject, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowDown } from "lucide-react";
import { useInView } from "react-intersection-observer";

interface LogViewerProps {
  content: string[];
  searchQuery: string;
  showLineNumbers: boolean;
  isLoading: boolean;
  isLoadingUp: boolean;
  isLoadingDown: boolean;
  containerRef: RefObject<HTMLDivElement>;
  totalLines: number;
  startLineIndex: number;
  onScrollUp: () => void;
  onLoadMore: () => void;
}

export function LogViewer({
  content,
  searchQuery,
  showLineNumbers,
  isLoading,
  isLoadingUp,
  isLoadingDown,
  containerRef,
  totalLines,
  startLineIndex,
  onScrollUp,
  onLoadMore,
}: LogViewerProps) {
  const hasContent = content.length > 0;

  // Sentinel for top scrolling
  const { ref: topRef, inView: topInView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (topInView && !isLoading && !isLoadingUp && startLineIndex > 0) {
      onScrollUp();
    }
  }, [topInView, isLoading, isLoadingUp, startLineIndex, onScrollUp]);

  return (
    <div
      className="bg-muted p-4 rounded-md flex-1 overflow-y-auto min-h-0 relative flex flex-col"
      ref={containerRef}
    >
      {/* Initial Loading Skeleton */}
      {isLoading && !hasContent ? (
        <div className="w-full space-y-2">
          {Array.from({ length: 100 }).map((_, i) => {
            const randomWidth = Math.floor(Math.random() * 50) + 50;
            return (
              <Skeleton
                key={i}
                className="rounded-md h-6"
                style={{ width: `${randomWidth}%` }}
              />
            );
          })}
        </div>
      ) : hasContent ? (
        <>
          {/* Top Sentinel & Loading Indicator */}
          {startLineIndex > 0 && (
            <div
              ref={topRef}
              className="w-full h-4 bg-transparent flex justify-center"
            >
              {isLoadingUp && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Loading previous lines...
                </span>
              )}
            </div>
          )}

          {/* Log Content */}
          <pre className="whitespace-pre-wrap text-sm font-mono pb-4">
            {content.map((line, index) => {
              // Calculate actual line number
              const lineNumber = startLineIndex + index + 1;

              if (!searchQuery) {
                return (
                  <div
                    key={index}
                    className="border-b border-border/50 py-0.5 flex"
                  >
                    {showLineNumbers && (
                      <span className="text-xs text-muted-foreground text-right mr-3 select-none opacity-50 shrink-0">
                        {lineNumber}
                      </span>
                    )}
                    <span>{line}</span>
                  </div>
                );
              }

              const parts = line.split(new RegExp(`(${searchQuery})`, "gi"));
              return (
                <div
                  key={index}
                  className="border-b border-border/50 py-0.5 flex flex-row"
                >
                  {showLineNumbers && (
                    <span className="text-xs text-muted-foreground text-right mr-3 select-none opacity-50 shrink-0">
                      {lineNumber}
                    </span>
                  )}
                  <span className="break-all">
                    {parts.map((part, i) =>
                      part.toLowerCase() === searchQuery.toLowerCase() ? (
                        <mark
                          key={i}
                          className="bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white rounded-sm px-0.5"
                        >
                          {part}
                        </mark>
                      ) : (
                        part
                      )
                    )}
                  </span>
                </div>
              );
            })}
          </pre>

          {/* Load More Button (Manual Trigger) */}
          <div className="mt-2 flex justify-center pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingDown}
              className="gap-2"
            >
              {isLoadingDown ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4" /> Load More Logs
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground/50 italic py-2">
            Showing {content.length.toLocaleString()} lines (Total:{" "}
            {totalLines.toLocaleString()})
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-md w-full">
              <p className="text-lg font-semibold mb-1">No content available</p>
             
            </div>
      )}
    </div>
  );
}
