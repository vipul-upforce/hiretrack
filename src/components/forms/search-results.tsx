'use client';

import { Table, TableBody } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Candidate } from '@/types/candidate';
import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { JobDetailsDialog } from '@/app/dashboard/jobs-board/components/job-details-dialog';
import { EditCandidateDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/edit-candidate-dialog';
import { AssignCandidateDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-dialog';
import { AssignJobDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-job-dialog';
import AddRemarksDialog from '@/app/dashboard/jobs/[id]/components/Dialogs/add-remark-dialog';
import ConfirmationDialog from '../../app/dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog';
import { SearchResultsSkeletonLoader } from './search-results/skeleton-loader';
import { ResultsHeader } from './search-results/results-header';
import { ResultsInfo } from './search-results/results-info';
import { TableHeaderRow } from './search-results/table-header-row';
import { TableBodyRows } from './search-results/table-body-rows';
import { ResultsFooter } from './search-results/results-footer';
import { useSearchResultsLogic } from './hooks/use-search-logic';

interface SearchResultsProps {
  results: Candidate[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
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
  const logic = useSearchResultsLogic({
    results,
    refetch,
    onCandidateUpdate,
  });

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
          activeFilters={logic.activeFilters}
          onFilterToggle={logic.handleToggleFilter}
          onClearAllFilters={logic.handleClearAllFilters}
          visibleColumns={logic.visibleColumns}
          onColumnToggle={logic.handleColumnToggle}
          selectedCandidatesCount={logic.selectedCandidates.length}
          onBulkAssignJob={logic.handleBulkAssignJob}
          onBulkArchive={logic.handleBulkArchive}
          onBulkUnarchive={logic.handleBulkUnarchive}
        />

        <ResultsInfo
          filteredCount={logic.filteredResults.length}
          totalCount={totalResultsCount || 0}
          activeFilters={logic.activeFilters}
        />

        <div className="w-full overflow-x-auto px-2">
          <Table>
            <TableHeaderRow
              visibleColumns={logic.visibleColumns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              selectAll={logic.selectAll}
              onSelectAll={logic.handleSelectAll}
            />
            <TableBody>
              <TableBodyRows
                candidates={logic.filteredResults}
                visibleColumns={logic.visibleColumns}
                selectedCandidates={logic.selectedCandidates}
                onSelectCandidate={logic.handleSelectCandidate}
                onViewDetails={logic.handleViewDetails}
                onEdit={logic.handleEdit}
                onAssignInterviewer={logic.handleAssignInterviewer}
                onAssignJob={logic.handleAssignJob}
                onDelete={logic.handleDelete}
                onAddRemark={logic.handleAddRemark}
                onJobClick={logic.handleJobClick}
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
          filteredCount={logic.filteredResults.length}
          totalCount={totalResultsCount || 0}
          activeFilters={logic.activeFilters}
        />
      </Card>

      {/* Dialogs */}

      {logic.selectedCandidate && (
        <CandidateDetailsDialog
          candidate={logic.selectedCandidate}
          isOpen={logic.isDialogOpen}
          fromFilter
          onOpenChange={logic.setIsDialogOpen}
          refetchCandidates={refetch}
        />
      )}

      {logic.candidateToEdit && (
        <EditCandidateDialog
          candidate={logic.candidateToEdit}
          isOpen={logic.isEditDialogOpen}
          onOpenChange={logic.setIsEditDialogOpen}
          onUpdate={logic.handleCandidateUpdate}
          refetchAssignment={refetch}
          onSuccess={() => {
            logic.setIsEditDialogOpen(false);
            logic.setCandidateToEdit(null);
          }}
        />
      )}

      {logic.candidateToAssignInterviewer && (
        <AssignCandidateDialog
          candidate={logic.candidateToAssignInterviewer}
          isOpen={logic.isAssignInterviewerOpen}
          onOpenChange={logic.setIsAssignInterviewerOpen}
          refetch={refetch}
          onUpdate={logic.handleCandidateUpdate}
          setLocalCandidate={() => {}}
          onSuccess={() => {
            logic.setIsAssignInterviewerOpen(false);
            logic.setCandidateToAssignInterviewer(null);
          }}
        />
      )}

      {logic.candidateToAssignJob && (
        <AssignJobDialog
          candidate={logic.candidateToAssignJob}
          isOpen={logic.isAssignJobOpen}
          onOpenChange={logic.setIsAssignJobOpen}
          onJobAssignment={(updatedCandidates) => {
            if (updatedCandidates && onCandidateUpdate) {
              if (Array.isArray(updatedCandidates)) {
                updatedCandidates.forEach(onCandidateUpdate);
              } else {
                onCandidateUpdate(updatedCandidates);
              }
            }
            logic.setIsAssignJobOpen(false);
            logic.setCandidateToAssignJob(null);
            logic.handleSelectAll(false);
            refetch();
          }}
        />
      )}

      {logic.candidateToAddRemark && (
        <AddRemarksDialog
          candidate={logic.candidateToAddRemark}
          isOpen={logic.isAddRemarkOpen}
          onOpenChange={logic.setIsAddRemarkOpen}
          setOpenRemarksFor={() => {}}
          refetch={refetch}
          onRemarkAdded={logic.handleCandidateUpdate}
        />
      )}

      {logic.selectedJob && (
        <JobDetailsDialog
          job={logic.selectedJob}
          isOpen={logic.isJobDialogOpen}
          onOpenChange={logic.setIsJobDialogOpen}
          userRole="admin"
          onJobUpdate={() => {}}
        />
      )}

      {logic.isConfirmDialogOpen && logic.confirmDialogConfig && (
        <ConfirmationDialog
          isOpen={logic.isConfirmDialogOpen}
          setIsOpen={logic.setIsConfirmDialogOpen}
          title={logic.confirmDialogConfig.title}
          message={logic.confirmDialogConfig.message}
          onConfirm={logic.confirmDialogConfig.onConfirm}
          onCancel={logic.confirmDialogConfig.onCancel}
          isLoading={logic.isDeleting}
          loadingText={logic.confirmDialogConfig.loadingText}
          buttonName={logic.confirmDialogConfig.buttonName}
        />
      )}
    </>
  );
}
