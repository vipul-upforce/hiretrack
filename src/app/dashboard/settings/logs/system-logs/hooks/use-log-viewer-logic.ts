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
} from '@/lib/features/settings/settingsApi';
import { useDebounce } from '@/hooks/useDebounce';
import { SystemLogsResponse } from '../types';

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
  const [isInitialFileLoading, setIsInitialFileLoading] = useState(false);
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [totalStorage, setTotalStorage] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
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

  const triggerGetFileContent = useCallback(
    (args: any) => {
      if (logType === 'nginx') return triggerNginxContent(args);
      return triggerPm2Content(args);
    },
    [logType, triggerNginxContent, triggerPm2Content],
  );

  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
    setOffset(0);
    setTotalLines(0);
  }, [debouncedSearchQuery, setSearchQuery]);

  useEffect(() => {
    setLogFiles([]);
    setSelectedFile(null);
    setFileContent([]);
    setIsAvailable(false);
    setOffset(0);
    setTotalLines(0);
    onError?.(null);
  }, [logType, onError]);

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
        setSelectedFile(activeData.files[0]);
      }
    }
  }, [activeData, isFilesError, filesError, logType, selectedFile, onError]);

  useLayoutEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [selectedFile, searchQuery]);

  useEffect(() => {
    if (!selectedFile) return;

    if (offset === 0) {
      if (fileContent.length > 0) setFileContent([]);
      setIsInitialFileLoading(true);
    }

    triggerGetFileContent({
      file: selectedFile,
      offset: 0,
      limit: linesPerLoad,
      query: searchQuery || '',
    })
      .unwrap()
      .then((data) => {
        setFileContent(data.content || []);
        setOffset((data.offset || 0) + (data.content?.length || 0));
        setTotalLines(data.totalLines || 0);
      })
      .catch((err) => onError?.(err.message))
      .finally(() => setIsInitialFileLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, searchQuery, triggerGetFileContent]);

  useEffect(() => {
    const container = logContainerRef.current;
    const sentinel = document.getElementById('log-sentinel');

    if (
      !selectedFile
      || isFetchingMore
      || isInitialFileLoading
      || !container
      || !sentinel
    ) return;
    if (totalLines > 0 && offset >= totalLines) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          setIsFetchingMore(true);

          triggerGetFileContent({
            file: selectedFile,
            offset,
            limit: linesPerLoad,
            query: searchQuery || '',
          })
            .unwrap()
            .then((data) => {
              if (data.content?.length) {
                setFileContent((prev) => [...prev, ...data.content]);
                setOffset((prev) => prev + data.content.length);
              }
              setTotalLines(data.totalLines || 0);
            })
            .catch((err) => onError?.(err.message))
            .finally(() => {
              setIsFetchingMore(false);
            });
        }
      },
      {
        root: container,
        threshold: 0.1,
        rootMargin: '50px',
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    selectedFile,
    offset,
    totalLines,
    isFetchingMore,
    isInitialFileLoading,
    triggerGetFileContent,
    searchQuery,
    onError,
  ]);

  const handleFileSelect = useCallback(
    (file: string) => {
      if (selectedFile === file) return;
      setSearchQuery('');
      setRawSearch('');
      setSelectedFile(file);
      setFileContent([]);
      setOffset(0);
      setTotalLines(0);
      setIsInitialFileLoading(true);
    },
    [selectedFile, setSearchQuery],
  );

  const handleSearchChange = useCallback((v: string) => {
    setRawSearch(v);
  }, []);

  const globalLoading = isFilesLoading || isFileLoading || isFetchingMore || isInitialFileLoading;

  return {
    files: logFiles,
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
  };
}
