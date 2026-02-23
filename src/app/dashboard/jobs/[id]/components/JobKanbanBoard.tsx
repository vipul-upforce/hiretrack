import {
  DragDropContext,
  Droppable,
  DroppableProvided,
  DropResult,
} from '@hello-pangea/dnd';
import { mergeRefs } from 'react-merge-refs';
import { Candidate, CandidateColumn } from '@/types/candidate';
import React from 'react';
import { IJobLaneConfig, ILaneConfig } from '@/lib/models/JobLaneConfig';
import { KanbanColumn } from './Lanes/KanbanColumn';

interface JobKanbanBoardProps {
  columns: CandidateColumn[];
  scrollRef: React.Ref<HTMLDivElement>;
  isDragging: boolean;
  setIsDndDragging: (dragging: boolean) => void;
  onDragEnd: (result: DropResult) => void;
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
  onDeferStatusToChecklist?: (validationInfo: string, newStatus: string) => void;
}

export function JobKanbanBoard({
  columns,
  scrollRef,
  isDragging,
  setIsDndDragging,
  onDragEnd,
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
}: JobKanbanBoardProps) {
  return (
    <div className="flex-1 overflow-hidden px-4 pb-2 pt-2">
      <DragDropContext
        onBeforeDragStart={() => {
          document.body.classList.add('dnd-dragging');
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
                  (config: ILaneConfig) => config.laneId === column.id,
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
