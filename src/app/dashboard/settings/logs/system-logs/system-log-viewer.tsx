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
    offset,
    totalLines,
    isFetchingMore,
    rawSearch,
    isFilesLoading,
    globalLoading,
    logContainerRef,
    setShowLn,
    handleFileSelect,
    handleSearchChange,
    totalStorage,
  } = useLogViewerLogic(props);

  if (isFilesLoading) return <NginxLogsSkeleton />;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
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
        <div className="col-span-3 flex flex-col min-h-0">
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
                key={`${selectedFile}-${props.logType}`}
                content={fileContent}
                searchQuery={props.searchQuery}
                showLineNumbers={showLn}
                isLoading={globalLoading}
                isFetchingMore={isFetchingMore}
                containerRef={logContainerRef}
                offset={offset}
                totalLines={totalLines}
              />
            </>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-sm flex-1 flex items-center justify-center">
              Select a
              {' '}
              {props.logType.toUpperCase()}
              {' '}
              log file to view its
              contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
