"use client";

import { useEffect, useRef, useState } from "react";
import {
  useGetNginxLogFilesQuery,
  useLazyGetNginxFileContentQuery,
} from "@/lib/features/settings/settingsApi";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
};

export function NginxLogs({ searchQuery, setSearchQuery, onError }: Props) {
  const [nginxFiles, setNginxFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [isNginxAvailable, setIsNginxAvailable] = useState(false);
  const [showLn, setShowLn] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const linesPerLoad = 100;
  const logContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: nginxData,
    isFetching: isFilesLoading,
    isError: isFilesError,
    error: filesError,
  } = useGetNginxLogFilesQuery(undefined, { skip: !!searchQuery });

  const [
    triggerGetFileContent,
    {
      data: fileData,
      isFetching: isFileLoading,
      isError: isFileError,
      error: fileError,
    },
  ] = useLazyGetNginxFileContentQuery();

  useEffect(() => {
    onError?.(null);

    if (isFilesError) {
      onError?.("Error fetching nginx logs: " + (filesError as any)?.message);
      setIsNginxAvailable(false);
      return;
    }

    if (nginxData?.files) {
      setNginxFiles(nginxData.files);
      setIsNginxAvailable(nginxData.files.length > 0);
    }
  }, [nginxData, isFilesError, filesError, onError]);

  useEffect(() => {
    if (!selectedFile) return;
    onError?.(null);
    setFileContent([]);
    setOffset(0);

    triggerGetFileContent({
      file: selectedFile,
      offset: 0,
      limit: linesPerLoad,
      query: searchQuery || "",
    })
      .unwrap()
      .then((data) => {
        setFileContent(data.content || []);
        setOffset((data.offset || 0) + (data.content?.length || 0));
        setTotalLines(data.totalLines || 0);
      })
      .catch((err) => {
        onError?.("Error fetching file content: " + err.message);
      });
  }, [selectedFile, searchQuery, triggerGetFileContent, onError]);

  //  infinite scroll observer
  useEffect(() => {
    if (!selectedFile || isFetchingMore) return;
    if (offset >= totalLines && totalLines !== 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
          const container = logContainerRef.current;
          if (!container) return;

          setIsFetchingMore(true);
          triggerGetFileContent({
            file: selectedFile,
            offset,
            limit: linesPerLoad,
            query: searchQuery || "",
          })
            .unwrap()
            .then((data) => {
              setFileContent((prev) => [...prev, ...(data.content || [])]);
              setOffset((data.offset || 0) + (data.content?.length || 0));
              setTotalLines(data.totalLines || 0);

            })
            .catch((err) => {
              onError?.("Error fetching more logs: " + err.message);
            })
            .finally(() => setIsFetchingMore(false));
        }
      },
      { root: logContainerRef.current, threshold: 0.1, rootMargin: "1000px" }
    );

    const sentinel = document.getElementById("log-sentinel");
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [
    selectedFile,
    offset,
    totalLines,
    isFetchingMore,
    triggerGetFileContent,
    searchQuery,
    onError,
  ]);

  const isLoading = isFilesLoading || isFileLoading || isFetchingMore;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* File List */}
        <div className="col-span-1 flex flex-col min-h-0">
          <h3 className="font-bold text-sm mb-2 flex-shrink-0">
            Log Files ({nginxFiles.length})
          </h3>
          <div className="flex-1 overflow-y-auto min-h-0">
            {isFilesLoading ? (
              <div className="text-gray-500 text-sm">Loading files...</div>
            ) : isNginxAvailable ? (
              <ul className="space-y-1">
                {nginxFiles.map((file) => (
                  <li
                    key={file}
                    className={`cursor-pointer p-2 text-sm rounded ${
                      selectedFile === file
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => {
                      if (selectedFile === file) return;
                      setSearchQuery("");
                      setSelectedFile(file);
                      setOffset(0);
                      setTotalLines(0);
                    }}
                  >
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                No Nginx log files available.
              </div>
            )}
          </div>
        </div>

        {/* Log Content */}
        <div className="col-span-3 flex flex-col min-h-0">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex flex-row items-center w-[70%]">
                  <h3 className="font-bold text-sm mr-4">{selectedFile}</h3>
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => {
                      if (e.target.value !== "(" && e.target.value !== ")") {
                        setSearchQuery(e.target.value);
                        setOffset(0);
                        setTotalLines(0);
                        setFileContent([]);
                      }
                    }}
                    className="border rounded-lg px-4 py-2 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
                    aria-label="Search nginx logs"
                  />
                  {isLoading && !fileContent.length && (
                    <div className="px-4">
                      <div className="flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-row items-center gap-3">
                  <input
                    id="showln"
                    type="checkbox"
                    checked={showLn}
                    onChange={(e) => setShowLn(e.target.checked)}
                  />
                  <label htmlFor="showln" className="text-sm">
                    Show Line Numbers
                  </label>
                </div>
              </div>

              <div
                className="bg-muted p-4 rounded-md flex-1 overflow-y-auto min-h-0"
                ref={logContainerRef}
              >
                {fileContent.length > 0 ? (
                  <pre className="whitespace-pre-wrap text-sm">
                    {fileContent.map((line, index) => {
                      const parts = searchQuery
                        ? line.split(new RegExp(`(${searchQuery})`, "gi"))
                        : [line];
                      return (
                        <div
                          key={`${offset}-${index}`}
                          className="border-b border-border py-1 flex flex-row items-center"
                        >
                          {showLn && (
                            <p className="text-sm text-muted-foreground mr-2">
                              {index + 1}
                            </p>
                          )}
                          <p className="flex-1">
                            {parts.map((part, i) =>
                              searchQuery &&
                              part.toLowerCase() ===
                                searchQuery.toLowerCase() ? (
                                <mark
                                  key={i}
                                  className="bg-blue-200 rounded-[3px]"
                                >
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
                    {searchQuery && !isLoading ? (
                      <div className="text-center py-10">
                        <p className="text-lg font-semibold">
                          No matching logs found
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Try adjusting your search query or clear the filter.
                        </p>
                      </div>
                    ) : !searchQuery && !isLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-muted/50 rounded-md w-full">
                        <p className="text-lg font-semibold mb-1">
                          No content available
                        </p>
                        <p className="text-sm text-muted-foreground">
                          The selected log file is empty or unavailable.
                        </p>
                      </div>
                    ) : (
                      <div className="w-full space-y-2">
                        {Array.from({ length: 100 }).map((_, i) => {
                          const randomWidth =
                            Math.floor(Math.random() * 50) + 50; 
                          return (
                            <Skeleton
                              key={i}
                              className="rounded-md h-6"
                              style={{
                                width: `${randomWidth}%`
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {isFetchingMore && fileContent.length > 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-2">
                    Loading more logs...
                  </div>
                )}
                {offset >= totalLines && fileContent.length > 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-2">
                    All logs loaded.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-sm flex-1 flex items-center justify-center">
              Select a file to view its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
