import { RefObject } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LogViewerProps {
  content: string[];
  searchQuery: string;
  showLineNumbers: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  containerRef: RefObject<HTMLDivElement>;
  offset: number;
  totalLines: number;
}

export function LogViewer({
  content,
  searchQuery,
  showLineNumbers,
  isLoading,
  isFetchingMore,
  containerRef,
  offset,
  totalLines,
}: LogViewerProps) {
  const hasContent = content.length > 0;

  return (
    <div
      className="bg-muted p-4 rounded-md flex-1 overflow-y-auto min-h-0"
      ref={containerRef}
    >
      {isLoading ? (
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
        <pre className="whitespace-pre-wrap text-sm">
          {content.map((line, index) => {
            const parts = searchQuery
              ? line.split(new RegExp(`(${searchQuery})`, "gi"))
              : [line];
            return (
              <div
                key={`${offset}-${index}`}
                className="border-b border-border py-1 flex flex-row items-center"
              >
                {showLineNumbers && (
                  <p className="text-sm text-muted-foreground mr-2">
                    {index + 1}
                  </p>
                )}
                <p className="flex-1">
                  {parts.map((part, i) =>
                    searchQuery &&
                    part.toLowerCase() === searchQuery.toLowerCase() ? (
                      <mark key={i} className="bg-blue-200 rounded-[3px]">
                        {part}
                      </mark>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            );
          })}
          <div id="log-sentinel" className="h-1" />
        </pre>
      ) : (
        <div className="flex-1 flex items-center justify-center h-full">
          {searchQuery ? (
            <div className="text-center py-10">
              <p className="text-lg font-semibold">No matching logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search query or clear the filter.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-muted/50 rounded-md w-full">
              <p className="text-lg font-semibold mb-1">No content available</p>
              <p className="text-sm text-muted-foreground">
                The selected log file is empty or unavailable.
              </p>
            </div>
          )}
        </div>
      )}

      {isFetchingMore && hasContent && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-2">
          Loading more logs...
        </div>
      )}

      {offset >= totalLines && hasContent && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-2">
          All logs loaded.
        </div>
      )}
    </div>
  );
}
