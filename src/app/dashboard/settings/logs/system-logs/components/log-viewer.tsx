import React, { RefObject, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { LoadMoreSection } from './load-more-section';
import { LogSkeleton } from './logs-skeleton';
import { LogLine } from './log-line';
import { EmptyLogState } from './empty-log-page';

interface LogViewerProps {
  content: string[];
  searchQuery: string;
  showLineNumbers: boolean;
  isLoading: boolean;
  isLoadingUp: boolean;
  isLoadingDown: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
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

  // Sentinel for top scrolling detection
  const { ref: topSentinelRef, inView: topInView } = useInView({
    threshold: 0.1,
    rootMargin: '200px 0px 0px 0px',
  });

  // Handle auto-scroll up logic
  useEffect(() => {
    if (topInView && !isLoading && !isLoadingUp && startLineIndex > 0) {
      onScrollUp();
    }
  }, [topInView, isLoading, isLoadingUp, startLineIndex, onScrollUp]);

  const renderContent = () => {
    if (isLoading && !hasContent) {
      return <LogSkeleton />;
    }

    if (!isLoading && !hasContent) {
      return <EmptyLogState />;
    }

    return (
      <>
        {/* Top Loading Indicator & Sentinel */}
        {startLineIndex > 0 && (
          <div
            ref={topSentinelRef}
            className="flex h-6 w-full justify-center bg-transparent"
          >
            {isLoadingUp && (
              <span className="animate-pulse text-xs text-muted-foreground">
                Loading previous lines...
              </span>
            )}
          </div>
        )}

        {/* Lines Container */}
        <div className="whitespace-pre-wrap pb-4 font-mono text-sm">
          {content.map((line, index) => (
            <LogLine
              // eslint-disable-next-line react/no-array-index-key
              key={`${startLineIndex}-${index}`}
              line={line}
              lineNumber={startLineIndex + index + 1}
              searchQuery={searchQuery}
              showLineNumber={showLineNumbers}
            />
          ))}
        </div>

        {/* Bottom Load More Section */}
        <LoadMoreSection
          isLoading={isLoadingDown}
          onLoadMore={onLoadMore}
          currentCount={content.length}
          totalCount={totalLines}
        />
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-md bg-muted p-4"
    >
      {renderContent()}
    </div>
  );
}
