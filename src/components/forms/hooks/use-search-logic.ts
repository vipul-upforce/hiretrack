import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  useDeleteCandidateMutation,
  useBulkArchiveCandidatesMutation,
} from '@/lib/features/candidate/candidateApi';
import type { Candidate } from '@/types/candidate';
import type { Job } from '@/types/job';

interface UseSearchResultsLogicProps {
  results: Candidate[];
  refetch: () => Promise<void>;
  onCandidateUpdate?: (updatedCandidate: Candidate) => void;
}

interface ApiError {
  data?: {
    error?: string;
  };
}

export function useSearchResultsLogic({
  results,
  refetch,
  onCandidateUpdate,
}: UseSearchResultsLogicProps) {
  // UI State: Dialogs & Selections
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(
    null,
  );

  const [isAssignInterviewerOpen, setIsAssignInterviewerOpen] = useState(false);
  const [candidateToAssignInterviewer, setCandidateToAssignInterviewer] =
    useState<Candidate | null>(null);

  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);
  const [candidateToAssignJob, setCandidateToAssignJob] = useState<
    Candidate | Candidate[] | null
  >(null);

  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [candidateToAddRemark, setCandidateToAddRemark] =
    useState<Candidate | null>(null);

  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);
  const [candidateToAddFollowUp, setCandidateToAddFollowUp] =
    useState<Candidate | null>(null);

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [candidateToViewDuplicates, setCandidateToViewDuplicates] =
    useState<Candidate | null>(null);

  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  // Filtering & Tables
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<Candidate[]>(results);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      select: true,
      name: true,
      email: false,
      contact: false,
      skills: false,
      location: true,
      jobAssignment: true,
      overallScore: true,
      expectedCTC: true,
      currentCTC: true,
      experience: true,
      createdAt: true,
      actions: true,
      archived: false,
    },
  );

  // Confirmation Dialog State
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    buttonName: string;
    loadingText: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
  } | null>(null);

  // API Mutations
  const [deleteCandidate] = useDeleteCandidateMutation();
  const [bulkArchiveCandidates] = useBulkArchiveCandidatesMutation();

  // Helpers
  const applyFilters = useCallback(
    (candidates: Candidate[], filters: string[]) => {
      if (filters.length === 0) return candidates;

      return candidates.filter((candidate) =>
        filters.every((filter) => {
          switch (filter) {
            case 'top-scorer':
              return candidate.scores?.overall
                ? candidate.scores.overall >= 7
                : false;
            case 'unassigned':
              return !candidate.jobId || typeof candidate.jobId !== 'object';
            case 'interview-scheduled':
              return (
                candidate.assignment?.interviewerId &&
                typeof candidate.assignment.interviewerId === 'object' &&
                candidate.assignment.interviewerId._id
              );
            case 'exp-1+':
              return candidate.experience >= 1;
            case 'exp-3+':
              return candidate.experience >= 3;
            case 'exp-5+':
              return candidate.experience >= 5;
            case 'applied-this-week': {
              if (!candidate.createdAt) return false;
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              return new Date(candidate.createdAt) >= oneWeekAgo;
            }
            case 'applied-this-month': {
              if (!candidate.createdAt) return false;
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return new Date(candidate.createdAt as string) >= oneMonthAgo;
            }
            case 'archived':
              return candidate.isDeleted === true;
            default:
              return true;
          }
        }),
      );
    },
    [],
  );

  // Effects
  useEffect(() => {
    setFilteredResults(applyFilters(results, activeFilters));
    setSelectedCandidates([]);
    setSelectAll(false);
    setLastSelectedIndex(null);
  }, [results, activeFilters, applyFilters]);

  // Handlers: Filtering & Display
  const handleToggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  }, []);

  const handleClearAllFilters = useCallback(() => setActiveFilters([]), []);

  const handleColumnToggle = useCallback((column: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      if (!visible) {
        const currentCount = Object.values(prev).filter(
          (isVisible) => isVisible,
        ).length;

        if (currentCount <= 2) {
          toast({
            title: 'Action Denied',
            description: 'At least 2 columns must remain visible.',
            variant: 'destructive',
          });
          return prev;
        }
      }

      return { ...prev, [column]: visible };
    });
  }, []);

  // Handlers: Selection
  const handleSelectCandidate = useCallback(
    (candidateId: string, shiftKey: boolean = false) => {
      const candidateIndex = filteredResults.findIndex(
        (c) => c._id === candidateId,
      );

      if (shiftKey && lastSelectedIndex !== null && candidateIndex !== -1) {
        const startIndex = Math.min(lastSelectedIndex, candidateIndex);
        const endIndex = Math.max(lastSelectedIndex, candidateIndex);
        const rangeIds = filteredResults
          .slice(startIndex, endIndex + 1)
          .map((c) => c._id);

        setSelectedCandidates((prev) => {
          const allSelected = rangeIds.every((id) => prev.includes(id));
          const newSelection = new Set(prev);
          rangeIds.forEach((id) =>
            allSelected ? newSelection.delete(id) : newSelection.add(id),
          );
          return Array.from(newSelection);
        });
        setLastSelectedIndex(candidateIndex);
      } else {
        setSelectedCandidates((prev) =>
          prev.includes(candidateId)
            ? prev.filter((id) => id !== candidateId)
            : [...prev, candidateId],
        );
        setLastSelectedIndex(candidateIndex !== -1 ? candidateIndex : null);
      }
    },
    [filteredResults, lastSelectedIndex],
  );

  const handleSelectAll = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (!checked || checked === 'indeterminate') {
        setSelectedCandidates([]);
        setSelectAll(false);
      } else {
        setSelectedCandidates(filteredResults.map((c) => c._id));
        setSelectAll(true);
      }
    },
    [filteredResults],
  );

  // Handlers: Single Actions
  const handleViewDetails = useCallback((candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((candidate: Candidate) => {
    setCandidateToEdit(candidate);
    setIsEditDialogOpen(true);
  }, []);

  const handleAssignInterviewer = useCallback((candidate: Candidate) => {
    setCandidateToAssignInterviewer(candidate);
    setIsAssignInterviewerOpen(true);
  }, []);

  const handleAssignJob = useCallback((candidate: Candidate) => {
    setCandidateToAssignJob(candidate);
    setIsAssignJobOpen(true);
  }, []);

  const handleAddRemark = useCallback((candidate: Candidate) => {
    setCandidateToAddRemark(candidate);
    setIsAddRemarkOpen(true);
  }, []);

  const handleAddFollowUp = useCallback((candidate: Candidate) => {
    setCandidateToAddFollowUp(candidate);
    setIsAddFollowUpOpen(true);
  }, []);

  const handleJobClick = useCallback((job: Job) => {
    setSelectedJob(job);
    setIsJobDialogOpen(true);
  }, []);

  const handleOpenDuplicates = useCallback((candidate: Candidate) => {
    setCandidateToViewDuplicates(candidate);
    setIsDuplicateDialogOpen(true);
  }, []);

  const handleCandidateUpdate = useCallback(
    (updatedCandidate: Candidate) => {
      if (onCandidateUpdate) onCandidateUpdate(updatedCandidate);
    },
    [onCandidateUpdate],
  );

  // Handlers: Bulk Actions
  const handleBulkAssignJob = useCallback(() => {
    const candidatesToAssign = filteredResults.filter((c) =>
      selectedCandidates.includes(c._id),
    );
    setCandidateToAssignJob(candidatesToAssign);
    setIsAssignJobOpen(true);
  }, [filteredResults, selectedCandidates]);

  const executeBulkAction = useCallback(
    async (action: 'archive' | 'unarchive', buttonName: string) => {
      const candidates = filteredResults.filter((c) =>
        selectedCandidates.includes(c._id),
      );
      if (candidates.length === 0) {
        toast({ title: 'Info', description: 'No candidates selected' });
        return;
      }

      setConfirmDialogConfig({
        title: `Confirm ${buttonName}`,
        message: `Are you sure you want to ${action} ${candidates.length} candidate(s)?`,
        buttonName,
        loadingText: `${buttonName}ing...`,
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            const result = await bulkArchiveCandidates({
              candidateIds: candidates.map((c) => c._id),
              action,
            }).unwrap();

            if (result.updatedCount > 0) {
              toast({
                title: 'Success',
                description: `Successfully ${action}d ${result.updatedCount} candidate(s)`,
              });
              setSelectedCandidates([]);
              setSelectAll(false);
              await refetch();
            }
            if (result.skippedCount > 0) {
              toast({
                title: 'Info',
                description: `${result.skippedCount} candidate(s) were already ${action}d`,
              });
            }
          } catch (error: unknown) {
            const apiError = error as ApiError;
            toast({
              title: 'Error',
              description:
                apiError?.data?.error || `Failed to ${action} candidates`,
              variant: 'destructive',
            });
          } finally {
            setIsDeleting(false);
            setIsConfirmDialogOpen(false);
          }
        },
        onCancel: () => setIsConfirmDialogOpen(false),
      });
      setIsConfirmDialogOpen(true);
    },
    [filteredResults, selectedCandidates, bulkArchiveCandidates, refetch],
  );

  const handleBulkArchive = useCallback(
    () => executeBulkAction('archive', 'Archive'),
    [executeBulkAction],
  );
  const handleBulkUnarchive = useCallback(
    () => executeBulkAction('unarchive', 'Unarchive'),
    [executeBulkAction],
  );

  // Handlers: Delete/Restore
  const handleDelete = useCallback(
    (candidate: Candidate) => {
      const isRestore = candidate.isDeleted === true;
      setConfirmDialogConfig({
        title: isRestore ? 'Restore Candidate' : 'Confirm Delete',
        message: isRestore
          ? `Are you sure you want to restore ${candidate.name}?`
          : `Are you sure you want to delete ${candidate.name}? This action cannot be undone.`,
        buttonName: isRestore ? 'Restore' : 'Archive',
        loadingText: isRestore ? 'Restoring...' : 'Deleting...',
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            await deleteCandidate(candidate._id).unwrap();
            const updated = { ...candidate, isDeleted: !isRestore };
            if (onCandidateUpdate) onCandidateUpdate(updated);
            toast({
              title: 'Success',
              description: `Candidate ${candidate.name} ${isRestore ? 'restored' : 'deleted'} successfully`,
            });
          } catch (error: unknown) {
            const apiError = error as ApiError;
            toast({
              title: 'Error',
              description:
                apiError?.data?.error || `Failed to action candidate`,
              variant: 'destructive',
            });
          } finally {
            setIsDeleting(false);
            setIsConfirmDialogOpen(false);
          }
        },
        onCancel: () => setIsConfirmDialogOpen(false),
      });
      setIsConfirmDialogOpen(true);
    },
    [deleteCandidate, onCandidateUpdate],
  );

  return {
    // Data
    filteredResults,
    activeFilters,
    visibleColumns,
    selectedCandidates,
    selectAll,

    // Dialog States
    isDialogOpen,
    setIsDialogOpen,
    selectedCandidate,
    setSelectedCandidate,
    isJobDialogOpen,
    setIsJobDialogOpen,
    selectedJob,
    setSelectedJob,
    isEditDialogOpen,
    setIsEditDialogOpen,
    candidateToEdit,
    setCandidateToEdit,
    isAssignInterviewerOpen,
    setIsAssignInterviewerOpen,
    candidateToAssignInterviewer,
    setCandidateToAssignInterviewer,
    isAssignJobOpen,
    setIsAssignJobOpen,
    candidateToAssignJob,
    setCandidateToAssignJob,
    isAddRemarkOpen,
    setIsAddRemarkOpen,
    candidateToAddRemark,
    setCandidateToAddRemark,
    isAddFollowUpOpen,
    setIsAddFollowUpOpen,
    candidateToAddFollowUp,
    setCandidateToAddFollowUp,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    confirmDialogConfig,
    isDeleting,
    isDuplicateDialogOpen,
    setIsDuplicateDialogOpen,
    candidateToViewDuplicates,
    setCandidateToViewDuplicates,

    // Handlers
    handleToggleFilter,
    handleClearAllFilters,
    handleColumnToggle,
    handleSelectCandidate,
    handleSelectAll,
    handleViewDetails,
    handleEdit,
    handleAssignInterviewer,
    handleAssignJob,
    handleAddRemark,
    handleOpenDuplicates,
    handleAddFollowUp,
    handleJobClick,
    handleDelete,
    handleBulkAssignJob,
    handleBulkArchive,
    handleBulkUnarchive,
    handleCandidateUpdate,
  };
}
