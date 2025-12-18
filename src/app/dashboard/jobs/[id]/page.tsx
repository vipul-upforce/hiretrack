'use client';

import {
  DragDropContext,
  Droppable,
  DroppableProvided,
} from '@hello-pangea/dnd';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { Checkbox } from '@/components/ui/checkbox';
import { NoDataFound } from '@/app/not-found';
import { useSSE } from '@/hooks/useSSE';
import { mergeRefs } from 'react-merge-refs';
import { RootState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Settings2, BarChart3, MoreHorizontal, Mail } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { JobEmailNotificationSettingsDialog } from '@/components/dialogs/JobEmailNotificationSettingsDialog';
import { useSelector } from 'react-redux';
import logger from '@/lib/logger';
import { CreateCandidateDialog } from './components/Dialogs/create-candidate-dialog';
import { CreateLaneDialog } from './components/Dialogs/create-lane-dialog';
import { CandidateDetailsDialog } from './components/Dialogs/candidate-details-dialog';
import { initialCandidateColumns } from './data/initial-data';
import LoaderSkeleton from './components/Lanes/loader-skeleton';
import { Breadcrumb } from './components/Utils/breadcrumb';
import { KanbanColumn } from './components/Lanes/KanbanColumn';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { useDragToScroll } from './hooks/useDragToScroll';
import { useCandidate } from './hooks/useCandidate';
import ConfirmationDialog from './components/Dialogs/ConfirmationDialog';
import EditLaneDialog from './components/Lanes/edit-lane-dialog';
import { useNormalizedCandidates } from './hooks/useNormalizedCandidates';
import { useCandidateState } from './hooks/useCandidateState';
import { QuickSelectAndFilter } from './components/QuickSelectAndFilter';
import { JobAnalyticsModal } from '../../jobs-board/components/JobAnalyticsModal';
import ChecklistRemarksDialog from './components/Dialogs/checklist-remarks-dialog';
import { LaneChecklistConfigDialog } from './components/Dialogs/lane-checklist-config-dialog';
import { MigrationDialog } from './components/Dialogs/MigrationDialog';
import CandidateCustomFieldsDialog from './components/customFields/candidateCustomFieldsDialog';
import { GlobalRemarksDialog } from './components/Dialogs/global-remarks-dialog';
import { CustomCalendarEvent, Interviewer } from '../../calendar/types';

interface FilterState {
  search: string;
  logicalOperator: 'AND' | 'OR';
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
}

export default function JobProgressPage() {
  const id = useParams()?.id as string;

  const [columns, setColumns] = useState<CandidateColumn[]>(
    initialCandidateColumns,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null,
  );
  const [isConfirmLaneDeleteOpen, setIsConfirmLaneDeleteOpen] = useState(false);
  const [laneToEdit, setLaneToEdit] = useState<string | null>(null);
  const [initialLaneToEdit, setInitialLaneToEdit] = useState<string | null>(
    null,
  );
  const [isChecklistConfigOpen, setIsChecklistConfigOpen] = useState(false);
  const [checklistConfigLane, setChecklistConfigLane] = useState<{
    laneId: string;
    laneName: string;
    initialTab?: 'incoming' | 'outgoing';
  } | null>(null);

  // Handler for configuring checklist
  const handleConfigureChecklist = useCallback(
    (
      laneId: string,
      laneName: string,
      initialTab?: 'incoming' | 'outgoing',
    ) => {
      setChecklistConfigLane({ laneId, laneName, initialTab });
      setIsChecklistConfigOpen(true);
    },
    [],
  );

  const [filterConditions, setFilterConditions] = useState<FilterState | null>(
    null,
  );
  const { user } = useSelector((state: RootState) => state.auth || {});

  const {
    ref: scrollRef,
    setIsDndDragging,
    isDragging,
  } = useDragToScroll<HTMLDivElement>();

  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useFetchJobByIdQuery(id as string);

  // Temporary state for SSE integration (will be replaced by useCandidateState)
  const [tempSelectedCandidate, setTempSelectedCandidate] =
    useState<Candidate | null>(null);

  // Use normalized candidates hook (replaces manual merging)
  const {
    candidates: normalizedCandidates,
    isLoading: isCandidatesLoading,
    refetch,
  } = useNormalizedCandidates({
    jobId: id,
    role: user?.role || '',
    setSelectedCandidate: setTempSelectedCandidate,
    selectedCandidate: tempSelectedCandidate,
  });

  // Use candidate state hook (consolidates UI state)
  const {
    selectedCandidate,
    setSelectedCandidate,
    isDetailsOpen,
    setIsDetailsOpen,
    openRemarksFor,
    setOpenRemarksFor,
  } = useCandidateState({
    jobId: id,
    candidates: normalizedCandidates,
  });

  // Sync temp selected candidate with state hook
  useEffect(() => {
    if (
      tempSelectedCandidate &&
      tempSelectedCandidate._id !== selectedCandidate?._id
    ) {
      setSelectedCandidate(tempSelectedCandidate);
    }
  }, [tempSelectedCandidate, selectedCandidate, setSelectedCandidate]);

  const prevLanesSigRef = useRef<string>('');

  // Get SSE lanes separately (still needed for lane updates)
  const { lanes: updatedLanes } = useSSE(
    user?.role || '',
    setSelectedCandidate as (
      candidate: Candidate | CustomCalendarEvent | null,
    ) => void,
    selectedCandidate,
    id,
  );

  // Refetch candidates when lanes changed from SSE
  useEffect(() => {
    if (!updatedLanes || updatedLanes.length === 0) return;

    const sig = updatedLanes.join('|');
    if (sig === prevLanesSigRef.current) return;
    prevLanesSigRef.current = sig;

    refetch();
  }, [updatedLanes, refetch]);

  const [updateJob, { isLoading }] = useUpdateJobMutation();
  // NEW: Use job-specific lanes with fallback to user lanes
  const {
    data: jobLanes,
    isLoading: isJobLanesLoading,
    // error: jobLanesError,
  } = useGetJobLanesQuery(id as string, { skip: !id });
  const { data: userLanes, isLoading: isUserLanesLoading } = useGetLanesQuery(
    { userId: user?.id, jobId: id as string },
    { skip: !user?.id || !id },
  );

  // Use job-specific lanes if available, fallback to user lanes
  const lanes = jobLanes || userLanes;
  const isLanesLoading = isJobLanesLoading || isUserLanesLoading;

  // Fetch job lane configuration for checklist indicators
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(id as string, {
    skip: !id,
  });

  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLaneEditOpen, setIsLaneEditOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isPromptConfirmOpen, setIsPromptConfirmOpen] = useState(false);
  const [pendingPromptValue, setPendingPromptValue] = useState(false);

  const {
    handleAddLane,
    handleDeleteLane,
    handleEditLaneClick,
    handleEditLane,
    handleConfirmDeleteLane,
    handleMigrateAndDeleteLane,
    migrationLanes,
    isMigrationDialogOpen,
    setIsMigrationDialogOpen,
    laneToDelete,
    setLaneToDelete,
  } = useKanbanBoard({
    columns,
    setColumns,
    user,
    jobId: id, // NEW: Pass jobId for job-specific operations
    setIsConfirmLaneDeleteOpen,
    setIsLaneEditOpen,
    refetch,
  });

  const {
    onDragEnd,
    handleFileDrop,
    handleCandidateUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
  } = useCandidate({
    columns,
    setColumns,
    user,
    setOpenRemarksFor,
    setIsDialogOpen,
    setDroppedFileData,
    setCandidateToDelete,
    setIsDeleteDialogOpen,
    setSelectedCandidate,
    selectedCandidate,
    refetch,
    candidateToDelete,
    jobLaneConfig,
    job,
  });

  // Use normalized candidates (already merged and normalized)
  const mergedCandidates = normalizedCandidates;
  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Combine candidates from useFetchCandidatesQuery and useSSE
  useEffect(() => {
    if (normalizedCandidates && lanes) {
      let currentCandidates = [...mergedCandidates];

      // Apply filter conditions if they exist
      if (filterConditions) {
        currentCandidates = currentCandidates.filter((candidate) => {
          // Apply text search
          if (filterConditions.search) {
            const searchLower = filterConditions.search.toLowerCase();
            const matchesSearch =
              candidate.name.toLowerCase().includes(searchLower) ||
              candidate.skills.some((skill) =>
                skill.toLowerCase().includes(searchLower),
              ) ||
              candidate.experience.toString().includes(searchLower) ||
              (candidate.assignment?.interviewerId as Interviewer)?.name
                ?.toLowerCase()
                .includes(searchLower) ||
              candidate.location.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
          }

          // Apply other filters
          const activeFilters = [
            {
              key: 'topCandidates',
              filter: (c: Candidate) =>
                c.scores?.overall && c.scores.overall >= 7,
            },
            {
              key: 'appliedThisWeek',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return new Date(c.tracking.createdAt) >= oneWeekAgo;
              },
            },
            {
              key: 'appliedToday',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return (
                  new Date(c.tracking.createdAt) >= today &&
                  new Date(c.tracking.createdAt) < tomorrow
                );
              },
            },
            {
              key: 'appliedIn15Days',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                return new Date(c.tracking.createdAt) >= fifteenDaysAgo;
              },
            },
            {
              key: 'toFollowUp',
              filter: (c: Candidate) => c.followUp && c.followUp.note,
            },
            {
              key: 'assigned',
              filter: (c: Candidate) => c.assignment,
            },
            {
              key: 'notAssigned',
              filter: (c: Candidate) => !c.assignment,
            },
            {
              key: 'withRemarks',
              filter: (c: Candidate) => c.remarks && c.remarks.length > 0,
            },
            {
              key: 'withoutRemarks',
              filter: (c: Candidate) => !c.remarks || c.remarks.length === 0,
            },
          ].filter(
            (filter) =>
              filterConditions[filter.key as keyof FilterState] === true,
          );

          if (activeFilters.length > 0) {
            if (filterConditions.logicalOperator === 'AND') {
              return activeFilters.every(({ filter }) => filter(candidate));
            }
            return activeFilters.some(({ filter }) => filter(candidate));
          }

          return true;
        });
      }
      // Apply archived filter
      currentCandidates = currentCandidates.filter(
        (c) => showArchived || !c.isDeleted,
      );

      // Handle different lane data structures
      let lanesArray;
      if (updatedLanes) {
        lanesArray = updatedLanes;
      } else if (jobLanes?.lanes) {
        lanesArray = [...jobLanes.lanes];
      } else if (userLanes?.lanes) {
        lanesArray = [...userLanes.lanes];
      } else {
        lanesArray = [
          'applied',
          'screening',
          'shortlisted',
          'processing',
          'accepted',
          'rejected',
        ];
      }

      lanesArray.forEach((lane) => {
        if (!initialCandidateColumns.find((item) => item.id === lane)) {
          initialCandidateColumns.push({
            id: lane as CandidateStatus,
            title: lane,
            candidates: [],
          });
        }
      });

      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);
        const candidates = currentCandidates.filter(
          (c) =>
            c.status === lane && (showArchived ? c.isDeleted : !c.isDeleted),
        );

        return {
          id: lane as CandidateStatus,
          title: column?.title || lane,
          candidates,
        } as CandidateColumn;
      });

      setColumns(updatedColumns);
    }
  }, [mergedCandidates, lanes, updatedLanes, showArchived, filterConditions]);

  useEffect(() => {
    if (laneToEdit && initialLaneToEdit === null) {
      setInitialLaneToEdit(laneToEdit);
    }
  }, [laneToEdit]);

  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen]);

  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Fallback UI
  if (isJobLoading || isCandidatesLoading || isLanesLoading || !lanes) {
    return <LoaderSkeleton />;
  }

  if (jobError) {
    return <NoDataFound name="Job" />;
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ width: '100%' }}
    >
      <div className="flex-shrink-0 px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <Breadcrumb
            jobTitle={job?.title}
            links={[{ title: 'Jobs', href: '/dashboard/jobs-board' }]}
          />

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="mt-2 w-[270px]" align="end">
                <div className="space-y-2 px-1 pb-2 pt-4">
                  {user?.role === 'admin' && (
                    <div className="mx-4 mb-2 mt-1 flex items-center gap-2">
                      <Checkbox
                        id="promptForStatusChangeReason"
                        checked={job.promptForStatusChangeReason}
                        disabled={isLoading}
                        onCheckedChange={(checked: boolean) => {
                          setPendingPromptValue(checked);
                          setIsPromptConfirmOpen(true);
                        }}
                      />
                      <label
                        htmlFor="promptForStatusChangeReason"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Prompt for status change reason
                      </label>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setIsCustomFieldsOpen(true)}
                    className="w-full justify-start gap-2"
                  >
                    <Settings2 className="h-4 w-4" />
                    Personalized form fields
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      variant="ghost"
                      onClick={() => setIsAnalyticsOpen(true)}
                      className="w-full justify-start gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setIsEmailSettingsOpen(true)}
                    className="w-full justify-start gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email Settings
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <CreateLaneDialog onAddLane={handleAddLane} />
            <CreateCandidateDialog
              jobId={id as string}
              isOpen={isDialogOpen}
              setIsOpen={setIsDialogOpen}
              resumeFile={droppedFileData}
            />
          </div>
        </div>
      </div>

      <QuickSelectAndFilter
        currentJobId={id}
        candidates={mergedCandidates}
        onFilterChange={setFilterConditions}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      {/* <CandidatesPage /> */}
      <div className="flex-1 overflow-hidden px-4 pb-2 pt-2">
        <DragDropContext
          onBeforeDragStart={() => {
            // Add a class to the body before drag starts to apply CSS fixes
            document.body.classList.add('dnd-dragging');
          }}
          onDragStart={() => {
            setIsDndDragging(true);
          }}
          onDragEnd={(result) => {
            // Remove the class when drag ends
            document.body.classList.remove('dnd-dragging');
            setIsDndDragging(false);
            onDragEnd(result);
          }}
        >
          <Droppable droppableId="lanes" direction="horizontal" type="lane">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={mergeRefs([provided.innerRef, scrollRef])}
                className="flex h-full gap-1 overflow-x-auto"
              >
                {useMemo(
                  () =>
                    columns.map((column, index) => {
                      // Find the lane configuration for this column
                      const laneConfig = jobLaneConfig?.laneConfigs?.find(
                        (config) => config.laneId === column.id,
                      );

                      return (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          index={index}
                          isDragging={isDragging}
                          isFileOver={isFileOver}
                          setIsFileOver={setIsFileOver}
                          handleFileDrop={handleFileDrop}
                          handleDeleteLane={handleDeleteLane}
                          handleEditLane={handleEditLaneClick}
                          setLaneToDelete={setLaneToDelete}
                          setLaneToEdit={setLaneToEdit}
                          refetch={refetch}
                          selectedCandidate={selectedCandidate}
                          setSelectedCandidate={setSelectedCandidate}
                          isDetailsOpen={isDetailsOpen}
                          setIsDetailsOpen={setIsDetailsOpen}
                          openRemarksFor={openRemarksFor}
                          setOpenRemarksFor={setOpenRemarksFor}
                          handleDeleteClick={handleDeleteClick}
                          onConfigureChecklist={handleConfigureChecklist}
                          pendingMoves={pendingMoves}
                          laneConfig={laneConfig}
                        />
                      );
                    }),
                  [
                    columns,
                    jobLaneConfig,
                    isDragging,
                    isFileOver,
                    setIsFileOver,
                    handleFileDrop,
                    handleDeleteLane,
                    handleEditLaneClick,
                    setLaneToDelete,
                    setLaneToEdit,
                    refetch,
                    selectedCandidate,
                    setSelectedCandidate,
                    isDetailsOpen,
                    setIsDetailsOpen,
                    openRemarksFor,
                    setOpenRemarksFor,
                    handleDeleteClick,
                    handleConfigureChecklist,
                    pendingMoves,
                  ],
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleCandidateUpdate}
      />

      <EditLaneDialog
        isEditLaneDialogOpen={isLaneEditOpen}
        setIsEditLaneDialogOpen={setIsLaneEditOpen}
        editingLane={laneToEdit || ''}
        prevLane={initialLaneToEdit || ''}
        setEditingLane={setLaneToEdit}
        handleLaneUpdate={handleEditLane}
        isLoading={false}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        title="Are you sure?"
        message={
          selectedCandidate?.isDeleted
            ? 'This will unarchive this candidate. They will be visible in the regular view.'
            : 'This will archive this candidate. They will be hidden from the regular view.'
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
        buttonName={selectedCandidate?.isDeleted ? 'Unarchive' : 'Archive'}
      />
      <ConfirmationDialog
        isOpen={isConfirmLaneDeleteOpen}
        setIsOpen={setIsConfirmLaneDeleteOpen}
        title="Are you sure?"
        message="This will remove the lane from this job only. Other jobs will not be affected."
        onConfirm={() => laneToDelete && handleConfirmDeleteLane(laneToDelete)}
        onCancel={() => setIsConfirmLaneDeleteOpen(false)}
      />

      <MigrationDialog
        isOpen={isMigrationDialogOpen}
        lanes={migrationLanes}
        onClose={() => setIsMigrationDialogOpen(false)}
        onMigrate={handleMigrateAndDeleteLane}
        laneToDelete={laneToDelete}
      />

      <ConfirmationDialog
        isOpen={isPromptConfirmOpen}
        setIsOpen={setIsPromptConfirmOpen}
        title="Confirm Setting Change"
        message={`Are you sure you want to ${pendingPromptValue ? 'enable' : 'disable'} prompting for status change reasons?`}
        onConfirm={async () => {
          try {
            await updateJob({
              ...job,
              promptForStatusChangeReason: pendingPromptValue,
            });
          } catch (error) {
            logger.error('Failed to update job:', error);
          }
          setIsPromptConfirmOpen(false);
        }}
        onCancel={() => setIsPromptConfirmOpen(false)}
        buttonName="Confirm"
      />

      {/* Custom Fields Dialog */}
      <CandidateCustomFieldsDialog
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
        jobId={id}
      />

      {/* Job Analytics Modal */}
      {job && user && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          job={job}
          organizationId={user?.organizationId || ''}
        />
      )}

      {/* Job Email Notification Settings Dialog */}
      {job && (
        <JobEmailNotificationSettingsDialog
          isOpen={isEmailSettingsOpen}
          onOpenChange={setIsEmailSettingsOpen}
          jobId={job._id}
          jobTitle={job.title}
        />
      )}

      {/* Checklist and Remarks Dialog */}
      {openRemarksFor &&
        (() => {
          const candidate = columns
            .flatMap((col) => col.candidates)
            .find((c) => {
              if (c._id === openRemarksFor) return true;
              if (openRemarksFor.startsWith('{')) {
                try {
                  const parsed = JSON.parse(openRemarksFor);
                  return parsed.candidateId === c._id;
                } catch (e) {
                  logger.error(
                    'Failed to parse openRemarksFor JSON:',
                    openRemarksFor,
                    e,
                  );
                  return false;
                }
              }
              return false;
            });

          if (!candidate) {
            logger.error(
              'Candidate not found for openRemarksFor:',
              openRemarksFor,
            );
            return null;
          }

          const checklistInfo = openRemarksFor.startsWith('{')
            ? openRemarksFor
            : undefined;

          if (!checklistInfo) {
            return null;
          }

          return (
            <ChecklistRemarksDialog
              candidate={candidate}
              isOpen={!!openRemarksFor}
              onOpenChange={(open) => !open && setOpenRemarksFor(null)}
              setOpenRemarksFor={setOpenRemarksFor}
              refetch={refetch}
              checklistInfo={checklistInfo}
              onChecklistSuccess={(candidateId) => {
                completePendingMove(candidateId);
              }}
              onChecklistCancel={cancelPendingMove}
            />
          );
        })()}

      {/* Lane Checklist Configuration Dialog */}
      {checklistConfigLane && (
        <LaneChecklistConfigDialog
          isOpen={isChecklistConfigOpen}
          onOpenChange={setIsChecklistConfigOpen}
          jobId={id}
          laneId={checklistConfigLane.laneId}
          laneName={checklistConfigLane.laneName}
          initialTab={checklistConfigLane.initialTab}
        />
      )}

      {/* Global Remarks Dialog - Stays mounted even when cards are virtualized */}
      <GlobalRemarksDialog
        openRemarksFor={openRemarksFor}
        setOpenRemarksFor={setOpenRemarksFor}
        candidates={mergedCandidates}
        refetch={refetch}
      />
    </div>
  );
}
