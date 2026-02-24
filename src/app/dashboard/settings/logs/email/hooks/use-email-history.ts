import { useState, useEffect } from 'react';
import { useGetEmailHistoryQuery } from '@/lib/features/settings';
import { useDebounce } from '@/hooks/useDebounce';
import { EmailHistoryRecord } from '../types';

export function useEmailHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryRecord | null>(
    null,
  );
  const [rawSearch, setRawSearch] = useState(search);

  const debouncedSearchQuery = useDebounce(rawSearch, 700);

  useEffect(() => {
    setSearch(debouncedSearchQuery);
    setPage(1); // Reset page on search change
  }, [debouncedSearchQuery]);

  const { data, isLoading, isFetching, refetch } = useGetEmailHistoryQuery({
    page,
    limit: 20,
    search,
    status: statusFilter,
  });

  const emails = data?.emails ?? [];
  const totalPages = data?.pagination?.total ?? 1;
  const loading = isLoading || isFetching;

  const handleSearchChange = (val: string) => {
    setRawSearch(val);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  return {
    emails,
    totalPages,
    selectedEmail,
    loading,
    page,
    statusFilter,
    rawSearch,
    setPage,
    setSelectedEmail,
    handleSearchChange,
    handleStatusChange,
    refetch,
    isRefreshing: isFetching,
  };
}
