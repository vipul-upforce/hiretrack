'use client';

import { LogFileList } from './components/log-file-list';
import { LogViewerControls } from './components/log-viewer-controls';
import { LogViewer } from './components/log-viewer';
import { useLogViewerLogic, LogType } from './hooks/use-log-viewer-logic';
import { SystemLogsResponse } from './types';
import NginxLogsSkeleton from './components/logs-skeleton';

interface SystemLogViewerProps extends SystemLogsResponse {
  logType: LogType;
}

export function SystemLogViewer(props: SystemLogViewerProps) {
  const {
    files,
    selectedFile,
    fileContent,
    isAvailable,
    showLn,
    totalLines,
    isLoadingUp,
    isLoadingDown,
    handleScrollUp,
    handleLoadMore,
    startLineIndex,
    rawSearch,
    isFilesLoading,
    globalLoading,
    logContainerRef,
    setShowLn,
    handleFileSelect,
    handleSearchChange,
    totalStorage,
  } = useLogViewerLogic(props);

  const { logType, searchQuery } = props;

  if (isFilesLoading) return <NginxLogsSkeleton />;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-4">
        {/* File List */}
        <LogFileList
          files={files}
          totalStorage={totalStorage}
          selectedFile={selectedFile}
          onSelect={handleFileSelect}
          isLoading={isFilesLoading}
          isAvailable={isAvailable}
        />

        {/* Log Content */}
        <div className="col-span-3 flex min-h-0 flex-col">
          {selectedFile ? (
            <>
              <LogViewerControls
                selectedFile={selectedFile}
                searchTerm={rawSearch}
                onSearchChange={handleSearchChange}
                showLineNumbers={showLn}
                onToggleLineNumbers={setShowLn}
                isLoading={globalLoading}
                hasContent={fileContent.length > 0}
              />
              <LogViewer
                key={`${selectedFile}-${logType}`}
                content={fileContent}
                searchQuery={searchQuery}
                showLineNumbers={showLn}
                isLoading={globalLoading}
                containerRef={logContainerRef}
                totalLines={totalLines}
                isLoadingUp={isLoadingUp}
                isLoadingDown={isLoadingDown}
                onScrollUp={handleScrollUp}
                onLoadMore={handleLoadMore}
                startLineIndex={startLineIndex}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Select a {logType.toUpperCase()} log file to view its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
