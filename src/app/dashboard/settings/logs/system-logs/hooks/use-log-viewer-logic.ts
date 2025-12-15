import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  useGetNginxLogFilesQuery,
  useGetPm2LogFilesQuery,
  useLazyGetNginxFileContentQuery,
  useLazyGetPm2LogFileContentQuery,
} from "@/lib/features/settings/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { SystemLogsResponse } from "../types";
import packageJson from "../../../../../../../package.json";

export type LogType = 'nginx' | 'pm2';

interface UseLogViewerLogicProps extends Omit<SystemLogsResponse, 'onError'> {
  logType: LogType;
  onError?: (error: string | null) => void;
}

export function useLogViewerLogic({
  logType,
  searchQuery,
  setSearchQuery,
  onError,
}: UseLogViewerLogicProps) {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [totalStorage, setTotalStorage] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showLn, setShowLn] = useState(false);

  const [startLineIndex, setStartLineIndex] = useState(0);
  const [endLineIndex, setEndLineIndex] = useState(0);

  const [totalLines, setTotalLines] = useState(0);
  const [rawSearch, setRawSearch] = useState(searchQuery);

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingUp, setIsLoadingUp] = useState(false);
  const [isLoadingDown, setIsLoadingDown] = useState(false);

  const linesPerLoad = 100;
  const logContainerRef = useRef<HTMLDivElement| null>(null);
  const previousScrollHeightRef = useRef<number>(0);

  const debouncedSearchQuery = useDebounce(rawSearch, 700);

  const {
    data: nginxData,
    isFetching: isNginxLoading,
    isError: isNginxError,
    error: nginxError,
  } = useGetNginxLogFilesQuery(undefined, {
    skip: logType !== 'nginx' || !!searchQuery,
  });

  const {
    data: pm2Data,
    isFetching: isPm2Loading,
    isError: isPm2Error,
    error: pm2Error,
  } = useGetPm2LogFilesQuery(undefined, {
    skip: logType !== 'pm2' || !!searchQuery,
  });

  const isFilesLoading = logType === 'nginx' ? isNginxLoading : isPm2Loading;
  const isFilesError = logType === 'nginx' ? isNginxError : isPm2Error;
  const filesError = logType === 'nginx' ? nginxError : pm2Error;
  const activeData = logType === 'nginx' ? nginxData : pm2Data;

  const [triggerNginxContent, { isFetching: isNginxFileLoading }] = useLazyGetNginxFileContentQuery();

  const [triggerPm2Content, { isFetching: isPm2FileLoading }] = useLazyGetPm2LogFileContentQuery();

  const isFileLoading = logType === 'nginx' ? isNginxFileLoading : isPm2FileLoading;

  const fetchLogs = useCallback(
    (args: any) => {
      if (logType === "nginx") return triggerNginxContent(args).unwrap();
      return triggerPm2Content(args).unwrap();
    },
    [logType, triggerNginxContent, triggerPm2Content],
  );

  // Reset on Search Change
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  // Reset on Tab Change
  useEffect(() => {
    setLogFiles([]);
    setSelectedFile(null);
    setFileContent([]);
    setIsAvailable(false);
    setStartLineIndex(0);
    setEndLineIndex(0);
    setTotalLines(0);
    onError?.(null);
  }, [logType, onError]);

  // Handle File List Data
  useEffect(() => {
    if (isFilesError) {
      onError?.(
        `Error fetching ${logType} logs: ${(filesError as any)?.message}`,
      );
      setIsAvailable(false);
      return;
    }
    if (activeData?.files) {
      setIsAvailable(activeData.files.length > 0);
      setLogFiles(activeData.files);
      setTotalStorage(activeData.size);
      if (!selectedFile && activeData.files.length > 0) {
        let fileToSelect = activeData.files[0];

        if (logType === "pm2") {
          const {version} = packageJson;
          const targetFileName = `hiretrack-v${version}-error.log`;

          const foundFile = activeData.files.find((f) => f === targetFileName);

          if (foundFile) {
            fileToSelect = foundFile;
          }
        }

        setSelectedFile(fileToSelect);
      }
    }
  }, [activeData, isFilesError, filesError, logType, selectedFile, onError]);

  // Initial Load (Tail)
  useEffect(() => {
    if (!selectedFile) return;

    setIsInitialLoading(true);
    setFileContent([]);

    fetchLogs({
      file: selectedFile,
      mode: "tail",
      limit: linesPerLoad,
      query: searchQuery || '',
    })
      .then((data) => {
        setFileContent(data.content || []);
        setStartLineIndex(data.start);
        setEndLineIndex(data.end);
        setTotalLines(data.totalLines || 0);

        // Force scroll to bottom initially
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
              logContainerRef.current.scrollHeight;
          }
        }, 100);
      })
      .catch((err) => onError?.(err.message))
      .finally(() => setIsInitialLoading(false));
  }, [selectedFile, searchQuery, fetchLogs, onError]);

  // Scroll Up Logic (Prepend)
  const handleScrollUp = useCallback(() => {
    if (isLoadingUp || startLineIndex === 0 || isInitialLoading) return;

    setIsLoadingUp(true);

    // Capture height for scroll restoration
    if (logContainerRef.current) {
      previousScrollHeightRef.current = logContainerRef.current.scrollHeight;
    }

    const reqEnd = startLineIndex;
    const reqStart = Math.max(0, startLineIndex - linesPerLoad);

    fetchLogs({
      file: selectedFile,
      mode: "range",
      start: reqStart,
      end: reqEnd,
      query: searchQuery || "",
    })
      .then((data) => {
        if (data.content?.length > 0) {
          setFileContent((prev) => [...data.content, ...prev]);
          setStartLineIndex(data.start);
        }
      })
      .catch((err) => onError?.(err.message))
      .finally(() => setIsLoadingUp(false));
  }, [
    isLoadingUp,
    startLineIndex,
    isInitialLoading,
    selectedFile,
    linesPerLoad,
    searchQuery,
    fetchLogs,
    onError,
  ]);

  useLayoutEffect(() => {
    if (
      isLoadingUp ||
      !logContainerRef.current ||
      previousScrollHeightRef.current === 0
    )
      return;

    const newScrollHeight = logContainerRef.current.scrollHeight;
    const diff = newScrollHeight - previousScrollHeightRef.current;

    if (diff > 0) {
      logContainerRef.current.scrollTop += diff;
    }
    previousScrollHeightRef.current = 0;
  }, [fileContent, isLoadingUp]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingDown || !selectedFile) return;

    setIsLoadingDown(true);

    const reqStart = endLineIndex;
    const reqEnd = endLineIndex + linesPerLoad;

    fetchLogs({
      file: selectedFile,
      mode: "range",
      start: reqStart,
      end: reqEnd,
      query: searchQuery || "",
    })
      .then((data) => {
        if (data.content?.length > 0) {
          setFileContent((prev) => [...prev, ...data.content]);
          setEndLineIndex(data.end);
          setTotalLines(data.totalLines);
        }
      })
      .catch((err) => onError?.(err.message))
      .finally(() => setIsLoadingDown(false));
  }, [
    isLoadingDown,
    selectedFile,
    endLineIndex,
    linesPerLoad,
    searchQuery,
    fetchLogs,
    onError,
  ]);

  const handleFileSelect = useCallback(
    (file: string) => {
      if (selectedFile === file) return;
      setRawSearch("");
      setSearchQuery("");
      setSelectedFile(file);
    },
    [selectedFile, setSearchQuery],
  );

  const handleSearchChange = useCallback((v: string) => {
    setRawSearch(v);
  }, []);

  const globalLoading = isFilesLoading || isFileLoading || isInitialLoading;

  return {
    files: logFiles,
    selectedFile,
    fileContent,
    isAvailable,
    showLn,
    offset: startLineIndex,
    totalLines,
    rawSearch,
    isFilesLoading,
    globalLoading,
    logContainerRef,
    setShowLn,
    handleFileSelect,
    handleSearchChange,
    totalStorage,
    isLoadingUp,
    isLoadingDown,
    startLineIndex,
    handleScrollUp,
    handleLoadMore,
  };
}
