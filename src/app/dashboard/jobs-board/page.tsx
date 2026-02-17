'use client';

import { DragDropContext } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useContext, useCallback, type ReactNode } from 'react';
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
import { BriefcaseBusiness, Mail, Settings2 } from 'lucide-react';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import CustomFieldDialog from '@/Custom_Fields/Components/Common/CustomFieldDialog';
import Stepper from '@/Custom_Fields/Components/Stepper';
import { JobEmailNotificationSettingsDialog } from '@/components/dialogs/JobEmailNotificationSettingsDialog';
import { GlobalEmailNotificationSettingsDialog } from '@/components/dialogs/GlobalEmailNotificationSettingsDialog';
import { useAppSelector } from '@/lib/redux/hooks';
import { ViewToggle } from './components/view-toggle';
import { JobsTableView } from './components/jobs-table';
import { JobsFilters } from './components/jobs-filters';
import DefaultLanesButton from './components/DefaultLanesButton';
import KanbanColumn from './components/kanban-column';
import { JobDetailsDialog } from './components/job-details-dialog';
import { CreateJobDialog } from './components/create-job-dialog';
import JobsSkeleton from './components/jobs-board-skeleton';
import { useJobsBoard } from './hooks/useJobsBoard';

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
  const {
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
    isCreatingJob,
    setDuplicate,
    isCustomFieldsOpen,
    setIsCustomFieldsOpen,
    isEmailSettingsOpen,
    setIsEmailSettingsOpen,
    isGlobalEmailSettingsOpen,
    setIsGlobalEmailSettingsOpen,
    selectedJobForEmailSettings,
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
    jobs,
    isLoading,
    error,
    filteredAndSortedJobs,
    handleJobCreated,
    handleEmailSettingsClick,
    handleSort,
    onDragEnd,
    handleJobUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
  } = useJobsBoard();

  const { user } = useAppSelector((state) => state.auth || {});
  const canCreateJobs = user?.role === 'admin' || user?.role === 'hr';
  const hasAnyJobs = (jobs?.length ?? 0) > 0;

  let jobsContent: ReactNode;

  if (!hasAnyJobs) {
    jobsContent = (
      <div className="flex h-full items-center justify-center">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
            <BriefcaseBusiness className="h-7 w-7 text-gray-500 dark:text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            No job positions yet
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600 dark:text-gray-400">
            Create your first job to start receiving applications and move
            candidates through the hiring pipeline.
          </p>
          {canCreateJobs ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <CreateJobDialog
                onJobCreated={handleJobCreated}
                userRole={user?.role}
              />
              <Button
                variant="outline"
                onClick={() => setIsCustomFieldsOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Personalized form fields
              </Button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              Ask your HR or admin team to create a new job position.
            </p>
          )}
        </div>
      </div>
    );
  } else if (viewMode === 'board') {
    jobsContent = (
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
    );
  } else {
    jobsContent = (
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
    );
  }

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
      {hasAnyJobs && (
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
      )}

      {/* Content Area - Board or Table View */}
      <div className="mt-4 flex-1 overflow-hidden px-4 pb-4">
        {jobsContent}
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
