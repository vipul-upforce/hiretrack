import {
  DragDropContext,
  Droppable,
  DroppableProvided,
  DropResult,
} from '@hello-pangea/dnd';
import { mergeRefs } from 'react-merge-refs';
import { CandidateColumn, Candidate } from '@/types/candidate';
import { ILaneConfig } from '@/lib/models/JobLaneConfig';
import { KanbanColumn } from './Lanes/KanbanColumn';

interface JobPageKanbanProps {
  columns: CandidateColumn[];
  scrollRef: (node: HTMLDivElement | null) => void;
  setIsDndDragging: (dragging: boolean) => void;
  isDragging: boolean;
  isFileOver: boolean;
  setIsFileOver: (over: boolean) => void;
  handleFileDrop: (file: File) => void;
  handleDeleteLane: () => void;
  handleEditLane: () => void;
  setLaneToDelete: (lane: string | null) => void;
  setLaneToEdit: (lane: string | null) => void;
  refetch: () => Promise<void>;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  openRemarksFor: string | null;
  setOpenRemarksFor: (id: string | null) => void;
  handleDeleteClick: (id: string) => void;
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
  jobLaneConfig: { laneConfigs: ILaneConfig[] } | undefined;
  onDragEnd: (result: DropResult) => void;
}

export function JobPageKanban({
  columns,
  scrollRef,
  setIsDndDragging,
  isDragging,
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
  onDragEnd,
}: JobPageKanbanProps) {
  /**
   * NOTE: React hooks (useMemo etc) must not be called inside a callback/render prop/function body.
   * The linter error occurred because useMemo was called inside the Droppable's render function.
   * Move useMemo *above* the return statement, inside the component body.
   */
  const renderedColumns = columns.map((column, index) => {
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
        handleEditLane={handleEditLane}
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
      />
    );
  });

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
              {renderedColumns}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
