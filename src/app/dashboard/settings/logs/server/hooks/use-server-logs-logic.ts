import {
  useState, useMemo, useEffect, useCallback,
} from 'react';
import { useGetServerLogsQuery } from '@/lib/features/settings/settingsApi';
import { useLazyFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';
import { useRenderLogTitle } from '@/app/dashboard/hooks/useRenderLogTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { Candidate } from '@/types/candidate';
import { LogEntry } from '../types';

interface UseServerLogsLogicProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
}

export function useServerLogsLogic({
  searchQuery,
  setSearchQuery,
  onError,
}: UseServerLogsLogicProps) {
  const { toast } = useToast();
  const { renderLogTitle } = useRenderLogTitle();

  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [rawSearch, setRawSearch] = useState(searchQuery);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );

  const historyOffset = useMemo(
    () => (historyPage - 1) * historyPageSize,
    [historyPage, historyPageSize],
  );

  const debouncedSearchQuery = useDebounce(rawSearch, 500);

  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const {
    data: historyResp,
    isLoading: historyLoading,
    isFetching: historyFetching,
    refetch,
  } = useGetServerLogsQuery(
    { offset: historyOffset, limit: historyPageSize, query: searchQuery },
    { skip: false },
  );

  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  const historyLogs: LogEntry[] = historyResp?.logs || [];
  const totalHistoryLines = historyResp?.totalLines || 0;
  const historyBusy = historyLoading || historyFetching;

  const handlePageSizeChange = (v: string) => {
    setHistoryPageSize(Number.parseInt(v, 10));
    setHistoryPage(1);
  };

  const handleSearchChange = (val: string) => {
    setRawSearch(val);
    setHistoryPage(1);
  };

  const handleCandidateModalDetail = async (key: string) => {
    try {
      const result = await fetchCandidateById(key);
      if (result.data) {
        setSelectedCandidate(result.data);
        return;
      }
      throw new Error('No candidate data returned');
    } catch (err: any) {
      onError?.(null);
      toast({
        title: 'Error',
        description: 'Failed to load candidate details',
        variant: 'destructive',
      });
    }
  };

  const closeCandidateModal = useCallback(() => {
    setSelectedCandidate(null);
  }, []);

  return {
    historyLogs,
    totalHistoryLines,
    selectedCandidate,
    renderLogTitle,
    historyPage,
    historyPageSize,
    rawSearch,
    historyBusy,
    historyOffset,
    refetch,
    setHistoryPage,
    handlePageSizeChange,
    handleSearchChange,
    handleCandidateModalDetail,
    closeCandidateModal,
  };
}
