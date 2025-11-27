import { useEffect, useRef, useState, useCallback } from "react";
import {
  useGetNginxLogFilesQuery,
  useLazyGetNginxFileContentQuery,
} from "@/lib/features/settings/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { NginxLogsProps } from "../types";

export function useNginxLogsLogic({
  searchQuery,
  setSearchQuery,
  onError,
}: NginxLogsProps) {
  const [isInitialFileLoading, setIsInitialFileLoading] = useState(false);
  const [nginxFiles, setNginxFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [isNginxAvailable, setIsNginxAvailable] = useState(false);
  const [showLn, setShowLn] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [rawSearch, setRawSearch] = useState(searchQuery);
  const linesPerLoad = 100;
  const logContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(rawSearch, 700);

  const {
    data: nginxData,
    isFetching: isFilesLoading,
    isError: isFilesError,
    error: filesError,
  } = useGetNginxLogFilesQuery(undefined, { skip: !!searchQuery });

  const [triggerGetFileContent, { isFetching: isFileLoading }] =
    useLazyGetNginxFileContentQuery();

  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
    setOffset(0);
    setTotalLines(0);
  }, [debouncedSearchQuery, setSearchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery === "") return;
    setFileContent([]);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    onError?.(null);

    if (isFilesError) {
      onError?.("Error fetching nginx logs: " + (filesError as any)?.message);
      setIsNginxAvailable(false);
      return;
    }

    if (nginxData?.files) {
      setIsNginxAvailable(nginxData.files.length > 0);
      if (selectedFile == null) {
        setSelectedFile(nginxData.files[0]);
      }
      setNginxFiles(nginxData.files);
    }
  }, [nginxData, isFilesError, filesError, onError, selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;
    onError?.(null);
    setFileContent([]);
    setOffset(0);
    setIsInitialFileLoading(true);

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
      })
      .finally(() => {
        setIsInitialFileLoading(false);
      });
  }, [selectedFile, searchQuery, triggerGetFileContent, onError]);

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

  const handleFileSelect = useCallback(
    (file: string) => {
      if (selectedFile === file) return;
      setSearchQuery("");
      setRawSearch("");
      setSelectedFile(file);
      setIsInitialFileLoading(true);
      setFileContent([]);
      setOffset(0);
      setTotalLines(0);
    },
    [selectedFile, setSearchQuery]
  );

  const handleSearchChange = useCallback((v: string) => {
    if (v !== "(" && v !== ")") {
      setRawSearch(v);
    }
  }, []);

  const globalLoading =
    isFilesLoading || isFileLoading || isFetchingMore || isInitialFileLoading;

  return {
    nginxFiles,
    selectedFile,
    fileContent,
    isNginxAvailable,
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
  };
}
