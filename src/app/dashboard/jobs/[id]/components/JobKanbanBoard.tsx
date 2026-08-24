import {
  DragDropContext,
  Droppable,
  DroppableProvided,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd';
import { mergeRefs } from 'react-merge-refs';
import { Candidate, CandidateColumn } from '@/types/candidate';
import React from 'react';
import { IJobLaneConfig, ILaneConfig } from '@/lib/models/JobLaneConfig';
import type { LaneRefetchRequest } from './Lanes/types';
import type { JobViewState } from '../utils/jobViewStorage';
import { KanbanColumn } from './Lanes/KanbanColumn';
import { KanbanColumnCursor } from './Lanes/KanbanColumnCursor';
import { useCursorPaginationForLanes } from '../hooks/useCursorPaginationForLanes';
import { hasActiveFilter } from '../utils/candidateViewFilter';

interface JobKanbanBoardProps {
  columns: CandidateColumn[];
  scrollRef: React.Ref<HTMLDivElement>;
  isDragging: boolean;
  setIsDndDragging: (dragging: boolean) => void;
  onDragEnd: (result: DropResult) => void;
  onBeforeDragStart?: (start: DragStart) => void;
  bulkDragState?: {
    isBulkDrag: boolean;
    draggedId: string | null;
    bulkIds: string[];
  };
  isFileOver: boolean;
  setIsFileOver: (over: boolean) => void;
  handleFileDrop: (file: File) => void;
  handleDeleteLane: (laneId: string) => void;
  handleEditLane: (laneId: string) => void;
  setLaneToDelete: (laneId: string | null) => void;
  setLaneToEdit: (laneId: string | null) => void;
  refetch: () => void;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  openRemarksFor: string | null;
  setOpenRemarksFor: (id: string | null) => void;
  handleDeleteClick: (candidateId: string) => void;
  onConfigureChecklist: (
    laneId: string,
    laneName: string,
    initialTab?: 'incoming' | 'outgoing',
  ) => void;
  pendingMoves: Array<{
    candidateId: string;
    sourceLaneId: string;
    targetLaneId: string;
    sourceIndex: number;
    targetIndex: number;
  }>;
  jobLaneConfig?: IJobLaneConfig;
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => { requiresChecklist: boolean; validationInfo?: string } | null;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  laneMapping?: Record<string, string>; // Map lane name -> Lane ObjectId
  kanbanVisibleCandidatesRef?: React.MutableRefObject<Map<string, Candidate>>;
  jobId: string;
  laneToRefetch?: LaneRefetchRequest;
  onLaneRefetchDone?: (laneId?: string) => void;
  /** After migration, set to destination lane id so that column resets to page 1. */
  resetLaneToPage1Id?: string | null;
  onResetLaneDone?: (laneId: string) => void;
  /** When status is updated from unified actions dialog, call so columns refetch affected lanes. */
  onLaneRefetch?: (laneIdOrLanes: string | string[], candidateId?: string, updatedCandidate?: Candidate) => void;
  /** Refetch only that lane's current page (tags, remark, delete, edit, etc.). */
  onLaneRefetchCurrentPage?: (laneId: string, candidateId?: string, updatedCandidate?: Candidate) => void;
  /** View state (filter + sort) for lane fetches and sort persistence. */
  viewState?: JobViewState;
  /** Persist lane sort to localStorage; called when user changes sort in a column. */
  setLaneSort?: (laneName: string, entry: { sortBy: string; sortOrder: number } | null) => void;
  /** When this key changes, all lanes reset to page 1 (filter/sort applied or cleared). */
  resetAllLanesToPage1Key?: number;
}

export function JobKanbanBoard({
  columns,
  scrollRef,
  isDragging,
  setIsDndDragging,
  onDragEnd,
  onBeforeDragStart,
  bulkDragState,
  isFileOver,
  setIsFileOver,
  handleFileDrop,
  handleDeleteLane,
  handleEditLane,
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
  onConfigureChecklist,
  pendingMoves,
  jobLaneConfig,
  onValidateStatusChange,
  onDeferStatusToChecklist,
  onOpenChecklistAfterSave,
  laneMapping,
  kanbanVisibleCandidatesRef,
  jobId,
  laneToRefetch,
  onLaneRefetchDone,
  resetLaneToPage1Id,
  onResetLaneDone,
  onLaneRefetch,
  onLaneRefetchCurrentPage,
  viewState,
  setLaneSort,
  resetAllLanesToPage1Key,
  bulkDragTwoPhase,
}: JobKanbanBoardProps) {
  const useCursorPagination = useCursorPaginationForLanes();
  // Strict API-only rendering is required for filters (to prevent stale cards),
  // but we still want SSE to move/update cards even when custom sorting is active.
  const strictApiOnly = hasActiveFilter(viewState?.filter);

  return (
    <div className="flex-1 overflow-hidden px-4 pl-2 pb-2 pt-2">
      <DragDropContext
        onBeforeDragStart={(start: DragStart) => {
          document.body.classList.add('dnd-dragging');
          onBeforeDragStart?.(start);
        }}
        onDragStart={() => {
          setIsDndDragging(true);
        }}
        onDragEnd={(result: DropResult) => {
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
              {columns.map((column, index) => {
                const laneConfig = jobLaneConfig?.laneConfigs?.find(
                  (config: ILaneConfig) =>
                    config.laneId === column.id ||
                    config.laneName?.toLowerCase() === column.id.toLowerCase(),
                );

                if (useCursorPagination) {
                  return (
                    <KanbanColumnCursor
                      key={column.id}
                      column={column}
                      index={index}
                      isDragging={isDragging}
                      isFileOver={isFileOver}
                      setIsFileOver={setIsFileOver}
                      handleFileDrop={handleFileDrop}
                      handleDeleteLane={() => handleDeleteLane(column.id)}
                      handleEditLane={() => handleEditLane(column.id)}
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
                      onConfigureChecklist={onConfigureChecklist}
                      pendingMoves={pendingMoves}
                      laneConfig={laneConfig}
                      laneMapping={laneMapping}
                      kanbanVisibleCandidatesRef={kanbanVisibleCandidatesRef}
                      jobId={jobId}
                      laneToRefetch={laneToRefetch}
                      onLaneRefetchDone={onLaneRefetchDone}
                      resetLaneToPage1Id={resetLaneToPage1Id}
                      onResetLaneDone={onResetLaneDone}
                      onLaneRefetch={onLaneRefetch}
                      onLaneRefetchCurrentPage={onLaneRefetchCurrentPage}
                      viewState={viewState}
                      setLaneSort={setLaneSort}
                      resetAllLanesToPage1Key={resetAllLanesToPage1Key}
                      strictApiOnly={strictApiOnly}
                      onValidateStatusChange={onValidateStatusChange}
                      onDeferStatusToChecklist={onDeferStatusToChecklist}
                      onOpenChecklistAfterSave={onOpenChecklistAfterSave}
                      bulkDragState={bulkDragState}
                    />
                  );
                }

                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    index={index}
                    isDragging={isDragging}
                    isFileOver={isFileOver}
                    setIsFileOver={setIsFileOver}
                    handleFileDrop={handleFileDrop}
                    handleDeleteLane={() => handleDeleteLane(column.id)}
                    handleEditLane={() => handleEditLane(column.id)}
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
                    onConfigureChecklist={onConfigureChecklist}
                    pendingMoves={pendingMoves}
                    laneConfig={laneConfig}
                    onValidateStatusChange={onValidateStatusChange}
                    onDeferStatusToChecklist={onDeferStatusToChecklist}
                    onOpenChecklistAfterSave={onOpenChecklistAfterSave}
                    laneMapping={laneMapping}
                    jobId={jobId}
                    laneToRefetch={laneToRefetch}
                    onLaneRefetchDone={onLaneRefetchDone}
                    resetLaneToPage1Id={resetLaneToPage1Id}
                    onResetLaneDone={onResetLaneDone}
                    onLaneRefetch={onLaneRefetch}
                    onLaneRefetchCurrentPage={onLaneRefetchCurrentPage}
                    viewState={viewState}
                    setLaneSort={setLaneSort}
                    resetAllLanesToPage1Key={resetAllLanesToPage1Key}
                    strictApiOnly={strictApiOnly}
                    bulkDragState={bulkDragState}
                  />
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
