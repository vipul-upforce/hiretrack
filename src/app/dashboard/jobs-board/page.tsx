'use client';

import { DragDropContext } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Job } from '@/types/job';
import {
  useCreateJobMutation,
  useDeleteJobMutation,
  useFetchJobsQuery,
  useUpdateJobStatusMutation,
} from '@/lib/features/job/jobApi';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Mail, Settings2 } from 'lucide-react';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import CustomFieldDialog from '@/Custom_Fields/Components/Common/CustomFieldDialog';
import Stepper from '@/Custom_Fields/Components/Stepper';
import { useSelector } from 'react-redux';
import { JobEmailNotificationSettingsDialog } from '@/components/dialogs/JobEmailNotificationSettingsDialog';
import { GlobalEmailNotificationSettingsDialog } from '@/components/dialogs/GlobalEmailNotificationSettingsDialog';
import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  isAfter,
  isSameDay,
} from 'date-fns';
import { ViewToggle } from './components/view-toggle';
import { JobsTableView } from './components/jobs-table';
import {
  JobsFilters,
  StatusFilterValue,
  DateFilterValue,
} from './components/jobs-filters';
import DefaultLanesButton from './components/DefaultLanesButton';
import KanbanColumn from './components/kanban-column';
import { initialColumns } from './data/initial-data';
import { JobDetailsDialog } from './components/job-details-dialog';
import { CreateJobDialog } from './components/create-job-dialog';
import JobsSkeleton from './components/jobs-board-skeleton';

interface User {
  role: string;
  organizationId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  jobs: Job[];
}

// Dialog component that auto-selects job position form
function JobCustomFieldsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const context = useContext(CustomFieldsContext);
  const { setStepName, customFields, selecteFormIdTarget } = context;
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  // Auto-select job position form when dialog opens
  useEffect(() => {
    if (
      isOpen &&
      !hasAutoSelected &&
      customFields &&
      Object.keys(customFields).length > 0
    ) {
      // Find the "job position" form ID
      const jobPositionFormEntry = Object.entries(customFields).find(
        ([_, form]) => form.formName.toLowerCase() === 'job position',
      );

      if (jobPositionFormEntry) {
        const [formId] = jobPositionFormEntry;
        selecteFormIdTarget(formId);
        setStepName('formCustomFieldList');
        setHasAutoSelected(true);
      } else {
        setStepName('FormList');
        setHasAutoSelected(true);
      }
    }
  }, [isOpen, hasAutoSelected, customFields, selecteFormIdTarget, setStepName]);

  const handleClose = useCallback(() => {
    setStepName('FormList');
    setHasAutoSelected(false);
    onClose();
  }, [setStepName, onClose]);

  // Reset auto-selection flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasAutoSelected(false);
    }
  }, [isOpen]);

  return (
    <CustomFieldDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Personalized form fields"
    >
      <Stepper />
    </CustomFieldDialog>
  );
}

function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  // const [user, setUser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {},
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [deleteJob] = useDeleteJobMutation();
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isGlobalEmailSettingsOpen, setIsGlobalEmailSettingsOpen] =
    useState(false); // New state for global settings dialog
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

  useEffect(() => {
    if (user) {
      refetch(); // Refetch jobs when user changes
    }
  }, [user, refetch]);
  useEffect(() => {
    if (selectedJob && duplicate) {
      handleJobCreated({ ...selectedJob, status: 'draft', isPublished: false });
      setDuplicate(false);
    }
  }, [selectedJob, duplicate]);

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

  const handleJobCreated = async (newJob: Omit<Job, 'id'>) => {
    setIsCreatingJob(true);
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
        await refetch(); // Wait for refetch to complete
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
    }
  };

  const handleEmailSettingsClick = (job: Job) => {
    setSelectedJobForEmailSettings(job);
    setIsEmailSettingsOpen(true);
  };

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort jobs for table view
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
        let aValue: any;
        let bValue: any;

        if (sortField === 'createdAt') {
          aValue = new Date(a.tracking?.createdAt || 0).getTime();
          bValue = new Date(b.tracking?.createdAt || 0).getTime();
        } else if (sortField === 'candidateCount') {
          aValue = a.candidateCount || 0;
          bValue = b.candidateCount || 0;
        } else if (sortField === 'experience') {
          aValue = a.experience || 0;
          bValue = b.experience || 0;
        } else {
          aValue = a[sortField as keyof Job];
          bValue = b[sortField as keyof Job];
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

  const onDragEnd = async (result: any) => {
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

    newColumns.forEach((col) => {
      if (col.id === source.droppableId) {
        col.jobs = sourceJobs;
      }
      if (col.id === destination.droppableId) {
        col.jobs = destJobs;
      }
    });

    setColumns(newColumns);

    if (showArchived) {
      return;
    }
    // Then update the database
    try {
      await updateJobStatus({
        id: draggableId,
        status: destination.droppableId,
        openJobCardsOrder:
          newColumns
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

  const handleDeleteClick = (jobId: string) => {
    setJobToDelete(jobId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    try {
      await deleteJob(jobToDelete).unwrap();

      setSelectedJob(null);
      toast({
        title: 'Success',
        description: 'Job Action Applied successfully.',
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
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

  if (isLoading) return <JobsSkeleton />;

  if (error) return <div>Error loading jobs</div>;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section - stays the same always */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <CardTitle className="line-clamp-2 text-xl font-bold md:mr-2">
              Job Positions
            </CardTitle>

            {/* Right Section - Controls and Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {/* Show Archived */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showArchived"
                  checked={showArchived}
                  onCheckedChange={(checked) =>
                    setShowArchived(checked as boolean)
                  }
                />
                <label
                  htmlFor="showArchived"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show Archived
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setIsGlobalEmailSettingsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Global Notification Setting
                </Button>
                <DefaultLanesButton userRole={user?.role} />
                <Button
                  variant="outline"
                  onClick={() => setIsCustomFieldsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Personalized form fields
                </Button>
                <CreateJobDialog
                  onJobCreated={handleJobCreated}
                  userRole={user?.role}
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and View Toggle Section - below header */}
      <div className="flex items-center gap-3 border-b border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-black">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Input - Only show in table view */}
          {viewMode === 'table' && (
            <div className="max-w-md flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Filters - Only show in table view */}
          {viewMode === 'table' && (
            <JobsFilters
              statusFilters={statusFilters}
              dateFilters={dateFilters}
              onStatusFilterChange={setStatusFilters}
              onDateFilterChange={setDateFilters}
            />
          )}
        </div>

        {/* View Toggle - Right side */}
        <ViewToggle view={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Content Area - Board or Table View */}
      <div className="mt-4 flex-1 overflow-hidden px-4 pb-4">
        {viewMode === 'board' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 h-full overflow-x-auto overflow-y-hidden">
              <div className="flex h-full min-w-full gap-1">
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    isCreatingJob={isCreatingJob}
                    setSelectedJob={setSelectedJob}
                    setIsDetailsOpen={setIsDetailsOpen}
                    setIsEditMode={setIsEditMode}
                    handleDeleteClick={handleDeleteClick}
                    setDuplicate={setDuplicate}
                    onEmailSettingsClick={handleEmailSettingsClick}
                  />
                ))}
              </div>
            </div>
          </DragDropContext>
        ) : (
          <JobsTableView
            jobs={filteredAndSortedJobs}
            setSelectedJob={setSelectedJob}
            setIsDetailsOpen={setIsDetailsOpen}
            setIsEditMode={setIsEditMode}
            handleDeleteClick={handleDeleteClick}
            setDuplicate={setDuplicate}
            onEmailSettingsClick={handleEmailSettingsClick}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </div>

      <JobDetailsDialog
        job={selectedJob}
        isOpen={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setIsEditMode(false);
          }
        }}
        userRole={user?.role}
        onJobUpdate={handleJobUpdate}
        isEditMode={isEditMode}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the job position and make it active again for
              candidates to view and apply. You can archive it again later if
              needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={
                !selectedJob?.isDeleted
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-blue hover:bg-blue text-blue-500 hover:text-blue-500/90'
              }
            >
              {selectedJob?.isDeleted ? 'Unarchive' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Fields Dialog */}
      <JobCustomFieldsDialog
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
      />

      {/* Job Email Notification Settings Dialog */}
      {selectedJobForEmailSettings && (
        <JobEmailNotificationSettingsDialog
          isOpen={isEmailSettingsOpen}
          onOpenChange={setIsEmailSettingsOpen}
          jobId={selectedJobForEmailSettings._id}
          jobTitle={selectedJobForEmailSettings.title}
        />
      )}

      {/* Global Email Notification Settings Dialog */}
      <GlobalEmailNotificationSettingsDialog
        isOpen={isGlobalEmailSettingsOpen}
        onOpenChange={setIsGlobalEmailSettingsOpen}
      />
    </div>
  );
}

export default KanbanPage;
