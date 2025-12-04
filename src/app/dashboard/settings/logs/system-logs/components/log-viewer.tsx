import { RefObject } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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

  const hasMore = totalLines > 0 && offset < totalLines;

  return (
    <div
      className="bg-muted p-4 rounded-md flex-1 overflow-y-auto min-h-0 relative"
      ref={containerRef}
    >
      {isLoading && !hasContent ? (
        <div className="w-full space-y-2">
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
        </div>
      ) : hasContent ? (
        <pre className="whitespace-pre-wrap text-sm font-mono">
          {content.map((line, index) => {
            if (!searchQuery) {
              return (
                <div
                  key={index}
                  className="border-b border-border/50 py-0.5 flex"
                >
                  {showLineNumbers && (
                    <span className="text-xs text-muted-foreground w-10 text-right mr-3 select-none opacity-50">
                      {index + 1}
                    </span>
                  )}
                  <span>{line}</span>
                </div>
              );
            }

            const parts = line.split(new RegExp(`(${searchQuery})`, 'gi'));
            return (
              <div
                key={index}
                className="border-b border-border/50 py-0.5 flex flex-row"
              >
                {showLineNumbers && (
                  <span className="text-xs text-muted-foreground w-10 text-right mr-3 select-none opacity-50">
                    {index + 1}
                  </span>
                )}
                <span className="break-all">
                  {parts.map((part, i) => (part.toLowerCase() === searchQuery.toLowerCase() ? (
                    <mark
                      key={i}
                      className="bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white rounded-sm px-0.5"
                    >
                      {part}
                    </mark>
                  ) : (
                    part
                  )))}
                </span>
              </div>
            );
          })}

          {hasMore && (
            <div id="log-sentinel" className="h-4 w-full bg-transparent" />
          )}
        </pre>
      ) : (
        <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
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

      {isFetchingMore && (
        <div className=" w-full bg-background/80 backdrop-blur p-2 text-center text-xs text-muted-foreground border-t">
          Loading more logs...
        </div>
      )}

      {!hasMore && hasContent && (
        <div className="py-4 text-center text-xs text-muted-foreground/50 italic">
          End of file
          {' '}
          <span className="mx-1">•</span>
          {' '}
          {totalLines.toLocaleString()}
          {' '}
          lines
        </div>
      )}
    </div>
  );
}
