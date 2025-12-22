'use client';

import { Table, TableBody } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { useCallback, useState, useEffect } from 'react';
import type { Candidate } from '@/types/candidate';
import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { JobDetailsDialog } from '@/app/dashboard/jobs-board/components/job-details-dialog';
import { EditCandidateDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/edit-candidate-dialog';
import { AssignCandidateDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-dialog';
import { AssignJobDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-job-dialog';
import AddRemarksDialog from '@/app/dashboard/jobs/[id]/components/Dialogs/add-remark-dialog';
import { toast } from '@/hooks/use-toast';
import {
  useDeleteCandidateMutation,
  useBulkArchiveCandidatesMutation,
} from '@/lib/features/candidate/candidateApi';
import ConfirmationDialog from '../../app/dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog';
import { SearchResultsSkeletonLoader } from './search-results/skeleton-loader';
import { ResultsHeader } from './search-results/results-header';
import { ResultsInfo } from './search-results/results-info';
import { TableHeaderRow } from './search-results/table-header-row';
import { TableBodyRows } from './search-results/table-body-rows';
import { ResultsFooter } from './search-results/results-footer';

interface SearchResultsProps {
  results: Candidate[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (page: number) => void;
  currentPageLimit: number;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  refetch: () => Promise<void>;
  totalResultsCount?: number;
  onCandidateUpdate?: (updatedCandidate: Candidate) => void;
}

export function SearchResults({
  results,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onLimitChange,
  sortField,
  currentPageLimit,
  sortDirection,
  onSort,
  refetch,
  totalResultsCount,
  onCandidateUpdate,
}: SearchResultsProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
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

  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<Candidate[]>(results);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

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

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      select: true,
      name: true,
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

  const [deleteCandidate] = useDeleteCandidateMutation();
  const [bulkArchiveCandidates] = useBulkArchiveCandidatesMutation();

  const applyFilters = useCallback(
    (candidates: Candidate[], filters: string[]) => {
      if (filters.length === 0) return candidates;

      return candidates.filter((candidate) =>
        filters.every((filter) => {
          switch (filter) {
            case 'top-scorer':
              return candidate.scores?.overall >= 7;
            case 'unassigned':
              return !candidate.jobId || typeof candidate.jobId !== 'object';
            case 'interview-scheduled':
              const hasValidInterviewer =
                candidate.assignment &&
                candidate.assignment.interviewerId &&
                typeof candidate.assignment.interviewerId === 'object' &&
                candidate.assignment.interviewerId._id &&
                candidate.assignment.interviewerId.name;
              return hasValidInterviewer;
            case 'exp-1+':
              return candidate.experience >= 1;
            case 'exp-3+':
              return candidate.experience >= 3;
            case 'exp-5+':
              return candidate.experience >= 5;
            case 'applied-this-week':
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              return new Date(candidate.createdAt) >= oneWeekAgo;
            case 'applied-this-month':
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return new Date(candidate.createdAt) >= oneMonthAgo;
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

  useEffect(() => {
    setFilteredResults(applyFilters(results, activeFilters));
    setSelectedCandidates([]);
    setSelectAll(false);
    setLastSelectedIndex(null);
  }, [results, activeFilters, applyFilters]);

  const handleToggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  const handleColumnToggle = useCallback((column: string, visible: boolean) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: visible,
    }));
  }, []);

  const handleSelectCandidate = useCallback(
    (candidateId: string, shiftKey: boolean = false) => {
      const candidateIndex = filteredResults.findIndex(
        (c) => c._id === candidateId,
      );

      if (shiftKey && lastSelectedIndex !== null && candidateIndex !== -1) {
        // Shift-click: toggle range selection from last selected to current
        const startIndex = Math.min(lastSelectedIndex, candidateIndex);
        const endIndex = Math.max(lastSelectedIndex, candidateIndex);
        const rangeIds = filteredResults
          .slice(startIndex, endIndex + 1)
          .map((c) => c._id);

        setSelectedCandidates((prev) => {
          // Check if all items in range are selected using current state
          const allSelected = rangeIds.every((id) => prev.includes(id));
          const newSelection = new Set(prev);
          if (allSelected) {
            // If all selected, unselect the range
            rangeIds.forEach((id) => newSelection.delete(id));
          } else {
            // If not all selected, select the range
            rangeIds.forEach((id) => newSelection.add(id));
          }
          return Array.from(newSelection);
        });
        setLastSelectedIndex(candidateIndex);
      } else {
        // Regular click: toggle single selection
        setSelectedCandidates((prev) => {
          if (prev.includes(candidateId)) {
            return prev.filter((id) => id !== candidateId);
          }
          return [...prev, candidateId];
        });
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
        setSelectedCandidates(
          filteredResults.map((candidate) => candidate._id),
        );
        setSelectAll(true);
      }
    },
    [filteredResults],
  );

  const handleBulkAssignJob = useCallback(() => {
    const candidatesToAssign = filteredResults.filter((candidate) =>
      selectedCandidates.includes(candidate._id),
    );
    setCandidateToAssignJob(candidatesToAssign);
    setIsAssignJobOpen(true);
  }, [filteredResults, selectedCandidates]);

  const handleBulkArchive = useCallback(() => {
    const candidatesToArchive = filteredResults.filter((candidate) =>
      selectedCandidates.includes(candidate._id),
    );

    if (candidatesToArchive.length === 0) {
      toast({
        title: 'Info',
        description: 'No candidates selected',
      });
      return;
    }

    setConfirmDialogConfig({
      title: 'Confirm Archive',
      message: `Are you sure you want to archive ${candidatesToArchive.length} candidate(s)?`,
      buttonName: 'Archive',
      loadingText: 'Archiving...',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const result = await bulkArchiveCandidates({
            candidateIds: candidatesToArchive.map((c) => c._id),
            action: 'archive',
          }).unwrap();

          if (result.updatedCount > 0) {
            toast({
              title: 'Success',
              description: `Successfully archived ${result.updatedCount} candidate(s)`,
            });

            setSelectedCandidates([]);
            setSelectAll(false);
            await refetch();
          }

          if (result.skippedCount > 0) {
            toast({
              title: 'Info',
              description: `${result.skippedCount} candidate(s) were already archived`,
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            error && typeof error === 'object' && 'data' in error
              ? (error.data as { error?: string })?.error
              : 'Failed to archive candidates';

          toast({
            title: 'Error',
            description: errorMessage || 'Failed to archive candidates',
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
  }, [filteredResults, selectedCandidates, bulkArchiveCandidates, refetch]);

  const handleBulkUnarchive = useCallback(() => {
    const candidatesToUnarchive = filteredResults.filter((candidate) =>
      selectedCandidates.includes(candidate._id),
    );

    if (candidatesToUnarchive.length === 0) {
      toast({
        title: 'Info',
        description: 'No candidates selected',
      });
      return;
    }

    setConfirmDialogConfig({
      title: 'Confirm Unarchive',
      message: `Are you sure you want to unarchive ${candidatesToUnarchive.length} candidate(s)?`,
      buttonName: 'Unarchive',
      loadingText: 'Unarchiving...',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const result = await bulkArchiveCandidates({
            candidateIds: candidatesToUnarchive.map((c) => c._id),
            action: 'unarchive',
          }).unwrap();

          if (result.updatedCount > 0) {
            toast({
              title: 'Success',
              description: `Successfully unarchived ${result.updatedCount} candidate(s)`,
            });

            setSelectedCandidates([]);
            setSelectAll(false);
            await refetch();
          }

          if (result.skippedCount > 0) {
            toast({
              title: 'Info',
              description: `${result.skippedCount} candidate(s) were already unarchived`,
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            error && typeof error === 'object' && 'data' in error
              ? (error.data as { error?: string })?.error
              : 'Failed to unarchive candidates';

          toast({
            title: 'Error',
            description: errorMessage || 'Failed to unarchive candidates',
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
  }, [filteredResults, selectedCandidates, bulkArchiveCandidates, refetch]);

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

            const updatedCandidate = {
              ...candidate,
              isDeleted: !isRestore,
            };

            if (onCandidateUpdate) onCandidateUpdate(updatedCandidate);

            toast({
              title: 'Success',
              description: isRestore
                ? `Candidate ${candidate.name} restored successfully`
                : `Candidate ${candidate.name} deleted successfully`,
            });
          } catch (error: unknown) {
            toast({
              title: 'Error',
              description:
                (typeof error === 'object' &&
                  error !== null &&
                  'data' in error &&
                  (error.data as { error?: string })?.error) ||
                `Failed to ${isRestore ? 'restore' : 'delete'} candidate ${candidate.name}`,
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

  const handleAddRemark = useCallback((candidate: Candidate) => {
    setCandidateToAddRemark(candidate);
    setIsAddRemarkOpen(true);
  }, []);

  const handleJobClick = useCallback((job: any) => {
    setSelectedJob(job);
    setIsJobDialogOpen(true);
  }, []);

  const handleCandidateUpdate = useCallback(
    (updatedCandidate: Candidate) => {
      if (onCandidateUpdate) {
        onCandidateUpdate(updatedCandidate);
      }
    },
    [onCandidateUpdate],
  );

  if (isLoading) {
    return <SearchResultsSkeletonLoader />;
  }

  if (results.length === 0) {
    return (
      <Card className="p-6">
        <div className="py-8 text-center">
          <p>No results found. Try adjusting your search criteria.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <ResultsHeader
          activeFilters={activeFilters}
          onFilterToggle={handleToggleFilter}
          onClearAllFilters={handleClearAllFilters}
          visibleColumns={visibleColumns}
          onColumnToggle={handleColumnToggle}
          selectedCandidatesCount={selectedCandidates.length}
          onBulkAssignJob={handleBulkAssignJob}
          onBulkArchive={handleBulkArchive}
          onBulkUnarchive={handleBulkUnarchive}
        />

        <ResultsInfo
          filteredCount={filteredResults.length}
          totalCount={totalResultsCount || 0}
          activeFilters={activeFilters}
        />

        <div className="w-full overflow-x-auto px-2">
          <Table>
            <TableHeaderRow
              visibleColumns={visibleColumns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              selectAll={selectAll}
              onSelectAll={handleSelectAll}
            />
            <TableBody>
              <TableBodyRows
                candidates={filteredResults}
                visibleColumns={visibleColumns}
                selectedCandidates={selectedCandidates}
                onSelectCandidate={handleSelectCandidate}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onAssignInterviewer={handleAssignInterviewer}
                onAssignJob={handleAssignJob}
                onDelete={handleDelete}
                onAddRemark={handleAddRemark}
                onJobClick={handleJobClick}
              />
            </TableBody>
          </Table>
        </div>

        <ResultsFooter
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={onPageChange}
          currentPageLimit={currentPageLimit}
          onLimitChange={onLimitChange}
          isLoading={isLoading}
          filteredCount={filteredResults.length}
          totalCount={totalResultsCount || 0}
          activeFilters={activeFilters}
        />
      </Card>

      {selectedCandidate && (
        <CandidateDetailsDialog
          candidate={selectedCandidate}
          isOpen={isDialogOpen}
          fromFilter
          onOpenChange={setIsDialogOpen}
          refetchCandidates={refetch}
        />
      )}

      {candidateToEdit && (
        <EditCandidateDialog
          candidate={candidateToEdit}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdate={handleCandidateUpdate}
          refetchAssignment={refetch}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setCandidateToEdit(null);
          }}
        />
      )}

      {candidateToAssignInterviewer && (
        <AssignCandidateDialog
          candidate={candidateToAssignInterviewer}
          isOpen={isAssignInterviewerOpen}
          onOpenChange={setIsAssignInterviewerOpen}
          refetch={refetch}
          onUpdate={handleCandidateUpdate}
          setLocalCandidate={() => {}}
          onSuccess={() => {
            setIsAssignInterviewerOpen(false);
            setCandidateToAssignInterviewer(null);
          }}
        />
      )}

      {candidateToAssignJob && (
        <AssignJobDialog
          candidate={candidateToAssignJob}
          isOpen={isAssignJobOpen}
          onOpenChange={setIsAssignJobOpen}
          onJobAssignment={(updatedCandidates) => {
            if (updatedCandidates && onCandidateUpdate) {
              if (Array.isArray(updatedCandidates)) {
                updatedCandidates.forEach((candidate) =>
                  onCandidateUpdate(candidate),
                );
              } else {
                onCandidateUpdate(updatedCandidates);
              }
            }
            setIsAssignJobOpen(false);
            setCandidateToAssignJob(null);
            setSelectedCandidates([]);
            setSelectAll(false);
            refetch();
          }}
        />
      )}

      {candidateToAddRemark && (
        <AddRemarksDialog
          candidate={candidateToAddRemark}
          isOpen={isAddRemarkOpen}
          onOpenChange={setIsAddRemarkOpen}
          setOpenRemarksFor={() => {}}
          refetch={refetch}
          onRemarkAdded={handleCandidateUpdate}
        />
      )}

      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          isOpen={isJobDialogOpen}
          onOpenChange={setIsJobDialogOpen}
          userRole="admin"
          onJobUpdate={() => {
            // Handle job update if needed
          }}
        />
      )}

      {isConfirmDialogOpen && confirmDialogConfig && (
        <ConfirmationDialog
          isOpen={isConfirmDialogOpen}
          setIsOpen={setIsConfirmDialogOpen}
          title={confirmDialogConfig.title}
          message={confirmDialogConfig.message}
          onConfirm={confirmDialogConfig.onConfirm}
          onCancel={confirmDialogConfig.onCancel}
          isLoading={isDeleting}
          loadingText={confirmDialogConfig.loadingText}
          buttonName={confirmDialogConfig.buttonName}
        />
      )}
    </>
  );
}
