import { useState, useRef } from 'react';
import { Candidate } from '@/types/candidate';

interface Interviewer {
  count: number;
  interviewerId: string;
  name: string;
  email: string;
}


/**
 * Custom hook to manage all local state for the dashboard page.
 * Consolidates all useState declarations into a single hook.
 */
export function useDashboardState() {
  const [open, setOpen] = useState(false);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [assignments, setAssignments] = useState<Candidate[]>([]);
  const [assignedInterviewers, setAssignedInterviewers] = useState<
    Interviewer[]
  >([]);
  const [assignmentsCounts, setAssignmentsCounts] = useState<{
    [key: string]: number;
  }>({
    totalInterviews: 0,
    thisWeek: 0,
    today: 0,
  });
  const [selectedCandidate, setSelectedCandidate] =
    useState<Candidate | null>(null);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [isActivitiesSidebarOpen, setIsActivitiesSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard-notifications-sidebar');
      return stored === null ? true : stored === 'open';
    }
    return true;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver>(null);

  return {
    // MultiSelect state
    open,
    setOpen,
    selectedAssignedTo,
    setSelectedAssignedTo,

    // Assignments state
    assignments,
    setAssignments,
    assignedInterviewers,
    setAssignedInterviewers,
    assignmentsCounts,
    setAssignmentsCounts,

    // Candidate dialog state
    selectedCandidate,
    setSelectedCandidate,
    isCandidateDialogOpen,
    setIsCandidateDialogOpen,

    // Sidebar state
    isActivitiesSidebarOpen,
    setIsActivitiesSidebarOpen,

    // Loading state
    isLoading,
    setIsLoading,
    isLoadingMore,
    setIsLoadingMore,

    // Search and filter state
    searchText,
    setSearchText,
    filterText,
    setFilterText,

    // Pagination state
    currentPage,
    setCurrentPage,
    hasMoreData,
    setHasMoreData,

    // Refs
    scrollContainerRef,
    loadingRef,
    observerRef,
  };
}

