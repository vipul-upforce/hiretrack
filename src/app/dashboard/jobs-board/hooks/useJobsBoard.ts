'use client';

import { useState, useEffect, useMemo } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { getJobExperienceSortValue } from '@/lib/utils/job-experience';
import { Job } from '@/types/job';
import {
  useCreateJobMutation,
  useDeleteJobMutation,
  useFetchJobsQuery,
  useUpdateJobStatusMutation,
} from '@/lib/features/job/jobApi';
import { toast } from '@/hooks/use-toast';
import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  isAfter,
  isSameDay,
} from 'date-fns';
import { useAppSelector } from '@/lib/redux/hooks';
import { initialColumns } from '../data/initial-data';
import { StatusFilterValue, DateFilterValue } from '../components/jobs-filters';

export interface KanbanColumn {
  id: string;
  title: string;
  jobs: Job[];
}

export interface UseJobsBoardReturn {
  // State
  columns: KanbanColumn[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (editMode: boolean) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  jobToDelete: string | null;
  isCreatingJob: boolean;
  creatingJobLane: Job['status'] | null;
  duplicate: boolean;
  setDuplicate: (duplicate: boolean) => void;
  isCustomFieldsOpen: boolean;
  setIsCustomFieldsOpen: (open: boolean) => void;
  isEmailSettingsOpen: boolean;
  setIsEmailSettingsOpen: (open: boolean) => void;
  isGlobalEmailSettingsOpen: boolean;
  setIsGlobalEmailSettingsOpen: (open: boolean) => void;
  selectedJobForEmailSettings: Job | null;
  setSelectedJobForEmailSettings: (job: Job | null) => void;
  viewMode: 'board' | 'table';
  setViewMode: (mode: 'board' | 'table') => void;
  statusFilters: StatusFilterValue[];
  setStatusFilters: (filters: StatusFilterValue[]) => void;
  dateFilters: DateFilterValue[];
  setDateFilters: (filters: DateFilterValue[]) => void;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Data
  jobs: Job[] | undefined;
  isLoading: boolean;
  error: unknown;

  // Computed
  filteredAndSortedJobs: Job[];

  // Handlers
  handleJobCreated: (newJob: Omit<Job, 'id'>) => Promise<void>;
  handleEmailSettingsClick: (job: Job) => void;
  handleSort: (field: string) => void;
  onDragEnd: (result: DropResult) => Promise<void>;
  handleJobUpdate: (updatedJob: Job) => void;
  handleDeleteClick: (jobId: string) => void;
  handleDeleteConfirm: () => Promise<void>;
}

/**
 * Custom hook for managing jobs board functionality.
 * Handles all state, API calls, filtering, sorting, and business logic for the jobs board.
 *
 * @returns All state, handlers, and computed values needed by the jobs board component
 */
export function useJobsBoard(): UseJobsBoardReturn {
  const { user } = useAppSelector((state) => state.auth || {});

  // Kanban columns state
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);

  // Job selection and details state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Archive and delete state
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // Job creation state
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [creatingJobLane, setCreatingJobLane] = useState<Job['status'] | null>(
    null,
  );
  const [duplicate, setDuplicate] = useState(false);

  // Dialog states
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isGlobalEmailSettingsOpen, setIsGlobalEmailSettingsOpen] =
    useState(false);
  const [selectedJobForEmailSettings, setSelectedJobForEmailSettings] =
    useState<Job | null>(null);

  // View mode and filters state with localStorage persistence
  const [viewMode, setViewMode] = useState<'board' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jobs-board-view-mode');
      return (saved as 'board' | 'table') || 'board';
    }
    return 'board';
  });

  const [statusFilters, setStatusFilters] = useState<StatusFilterValue[]>(
    () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('jobs-board-status-filters');
        try {
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      }
      return [];
    },
  );

  const [dateFilters, setDateFilters] = useState<DateFilterValue[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jobs-board-date-filters');
      try {
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [sortField, setSortField] = useState<string | null>(
    'tracking.createdAt',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // RTK Query hooks
  const [createJob] = useCreateJobMutation();
  const {
    data: jobs,
    error,
    isLoading,
    refetch,
  } = useFetchJobsQuery(undefined, {
    skip: !user,
  });
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const [deleteJob] = useDeleteJobMutation();

  // Refetch jobs when user changes
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  /**
   * Handles job creation
   */
  const handleJobCreated = async (newJob: Omit<Job, 'id'>) => {
    const targetLane = (newJob.status || 'draft') as Job['status'];
    setIsCreatingJob(true);
    setCreatingJobLane(targetLane);
    const job: Job = {
      ...newJob,
      _id: Math.random().toString(36).substr(2, 9),
      organizationId: user!.organizationId,
      candidateCount: 0,
    };

    try {
      toast({
        title: 'Uploading Documents',
        description: 'It can take while if its big file',
      });
      const res = (await createJob(job).unwrap()) as unknown;

      if (res) {
        await refetch();
        toast({
          title: 'Success',
          description: 'Job created successfully',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create job',
      });
    } finally {
      setIsCreatingJob(false);
      setCreatingJobLane(null);
    }
  };

  // Handle duplicate job creation
  useEffect(() => {
    if (selectedJob && duplicate) {
      handleJobCreated({
        ...selectedJob,
        status: 'draft',
        isPublished: false,
      });
      setDuplicate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob, duplicate]);

  // Update columns when jobs or showArchived changes
  useEffect(() => {
    if (jobs) {
      const initialColumnsWithJobs = initialColumns.map((column) => ({
        ...column,
        jobs: jobs.filter(
          (job) =>
            job.status === column.id &&
            (showArchived ? job.isDeleted : !job.isDeleted),
        ),
      }));
      setColumns(initialColumnsWithJobs);
    }
  }, [jobs, showArchived]);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobs-board-view-mode', viewMode);
    }
  }, [viewMode]);

  // Save status filters to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'jobs-board-status-filters',
        JSON.stringify(statusFilters),
      );
    }
  }, [statusFilters]);

  // Save date filters to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'jobs-board-date-filters',
        JSON.stringify(dateFilters),
      );
    }
  }, [dateFilters]);

  /**
   * Handles email settings click
   */
  const handleEmailSettingsClick = (job: Job) => {
    setSelectedJobForEmailSettings(job);
    setIsEmailSettingsOpen(true);
  };

  /**
   * Handles sorting by field
   */
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Filter and sort jobs for table view
   */
  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs || viewMode === 'board') return [];

    let filtered = jobs.filter((job) =>
      showArchived ? job.isDeleted : !job.isDeleted,
    );

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.skills?.some((skill) => skill.toLowerCase().includes(query)),
      );
    }

    // Apply status filters (OR logic - show if matches any selected status)
    if (statusFilters.length > 0) {
      filtered = filtered.filter((job) =>
        statusFilters.includes(job.status as StatusFilterValue),
      );
    }

    // Apply date filters (OR logic - show if matches any selected date range)
    if (dateFilters.length > 0 && filtered.length > 0) {
      const now = new Date();
      filtered = filtered.filter((job) => {
        if (!job.tracking?.createdAt) return false;
        const createdDate = new Date(job.tracking.createdAt);

        return dateFilters.some((filter) => {
          switch (filter) {
            case 'today':
              return isSameDay(createdDate, now);
            case 'week':
              return (
                isAfter(createdDate, startOfWeek(now)) ||
                isSameDay(createdDate, startOfWeek(now))
              );
            case 'month':
              return (
                isAfter(createdDate, startOfMonth(now)) ||
                isSameDay(createdDate, startOfMonth(now))
              );
            case 'quarter':
              return (
                isAfter(createdDate, startOfQuarter(now)) ||
                isSameDay(createdDate, startOfQuarter(now))
              );
            default:
              return false;
          }
        });
      });
    }

    // Apply sorting based on column clicks
    if (sortField) {
      const sorted = [...filtered].sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        if (sortField === 'createdAt') {
          aValue = new Date(a.tracking?.createdAt || 0).getTime();
          bValue = new Date(b.tracking?.createdAt || 0).getTime();
        } else if (sortField === 'candidateCount') {
          aValue = a.candidateCount || 0;
          bValue = b.candidateCount || 0;
        } else if (sortField === 'experience') {
          aValue = getJobExperienceSortValue(a.experience);
          bValue = getJobExperienceSortValue(b.experience);
        } else {
          aValue = a[sortField as keyof Job] as string | number | Date;
          bValue = b[sortField as keyof Job] as string | number | Date;
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Handle numeric comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });

      return sorted;
    }

    return filtered;
  }, [
    jobs,
    viewMode,
    showArchived,
    searchQuery,
    statusFilters,
    dateFilters,
    sortField,
    sortDirection,
  ]);

  /**
   * Handles drag and drop end event
   */
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find(
      (col) => col.id === destination.droppableId,
    );

    if (!sourceColumn || !destColumn) return;

    // Update local state first
    const newColumns = [...columns];
    const sourceJobs = [...sourceColumn.jobs];

    const destJobs =
      source.droppableId === destination.droppableId
        ? sourceJobs
        : [...destColumn.jobs];

    const [removed] = sourceJobs.splice(source.index, 1);
    const updatedJob = {
      ...removed,
      status: destination.droppableId,
    };

    destJobs.splice(destination.index, 0, updatedJob);

    // Instead of mutating col, create a new array with updated columns
    const updatedColumns = newColumns.map((col) => {
      if (col.id === source.droppableId) {
        return { ...col, jobs: sourceJobs };
      }
      if (col.id === destination.droppableId) {
        return { ...col, jobs: destJobs };
      }
      return col;
    });

    setColumns(updatedColumns);

    if (showArchived) {
      return;
    }
    // Then update the database
    try {
      await updateJobStatus({
        id: draggableId,
        status: destination.droppableId,
        openJobCardsOrder:
          updatedColumns
            .find((col) => col.id === 'open')
            ?.jobs.map((job) => job._id) || [],
      }).unwrap();
    } catch {
      // Revert the local state if the API call fails
      const revertColumns = [...columns];
      setColumns(revertColumns);

      toast({
        title: 'Error',
        description: 'Failed to update job status',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handles job update
   */
  const handleJobUpdate = (updatedJob: Job) => {
    const newColumns = columns.map((column) => ({
      ...column,
      jobs: column.jobs.map((job) =>
        job._id === updatedJob._id
          ? { ...updatedJob, candidateCount: updatedJob.candidateCount || 0 }
          : job,
      ),
    }));

    setColumns(newColumns);
  };

  /**
   * Handles delete click
   */
  const handleDeleteClick = (jobId: string) => {
    setJobToDelete(jobId);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Handles delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    try {
      await deleteJob(jobToDelete).unwrap();

      setSelectedJob(null);
      toast({
        title: 'Success',
        description: 'Job Action Applied successfully.',
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast({
          title: 'Error',
          description: e.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete job position',
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  return {
    // State
    columns,
    selectedJob,
    setSelectedJob,
    isDetailsOpen,
    setIsDetailsOpen,
    isEditMode,
    setIsEditMode,
    showArchived,
    setShowArchived,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    jobToDelete,
    isCreatingJob,
    creatingJobLane,
    duplicate,
    setDuplicate,
    isCustomFieldsOpen,
    setIsCustomFieldsOpen,
    isEmailSettingsOpen,
    setIsEmailSettingsOpen,
    isGlobalEmailSettingsOpen,
    setIsGlobalEmailSettingsOpen,
    selectedJobForEmailSettings,
    setSelectedJobForEmailSettings,
    viewMode,
    setViewMode,
    statusFilters,
    setStatusFilters,
    dateFilters,
    setDateFilters,
    sortField,
    sortDirection,
    searchQuery,
    setSearchQuery,

    // Data
    jobs,
    isLoading,
    error,

    // Computed
    filteredAndSortedJobs,

    // Handlers
    handleJobCreated,
    handleEmailSettingsClick,
    handleSort,
    onDragEnd,
    handleJobUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
  };
}




