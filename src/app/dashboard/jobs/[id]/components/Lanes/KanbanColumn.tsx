'use client';

import {
  Droppable,
  Draggable,
  type DroppableProvided,
  type DraggableProvided,
} from '@hello-pangea/dnd';
import {
  GripVertical,
  ArrowRightToLine,
  ArrowLeftFromLine,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { useState, useMemo, memo, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Virtuoso } from 'react-virtuoso';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import CustomScrollbarLane from '@/components/ui/custom-scrollbar-lane';
import { useAppSelector } from '@/lib/redux/hooks';
import { getJobId, getTrackingDate } from '../../utils/candidateAccessors';
import { LaneOptionsMenu } from './lanes-options-menu';
import { CandidateCard } from '../Candidate/candidate-card';
import { CandidateContextType, KanbanColumnProps, SortConfig } from './types';

// --- 2. Extract CandidateRow (Pure Component) ---
const CandidateRow = memo(
  ({
    candidate,
    index,
    isPending,
    context,
  }: {
    candidate: Candidate;
    index: number;
    isPending: boolean;
    context: CandidateContextType;
  }) => {
    // Helper handlers using context
    const handleViewDetails = () => {
      context.setSelectedCandidate(candidate);
      context.setIsDetailsOpen(true);
    };

    const handleDelete = () => {
      context.setSelectedCandidate(candidate);
      context.handleDeleteClick(candidate._id);
    };

    const handleSelect = () => {
      context.setSelectedCandidate(candidate);
    };

    return (
      <div className="pb-2">
        <CandidateCard
          key={candidate._id}
          candidate={candidate}
          index={index}
          refetch={context.refetch}
          onViewDetails={handleViewDetails}
          openRemarks={context.openRemarksFor === candidate._id}
          setOpenRemarksFor={context.setOpenRemarksFor}
          onDeleteClick={handleDelete}
          onEditClick={handleSelect}
          onAssignClick={handleSelect}
          onMarkAsDoneClick={handleSelect}
          onFollowUpClick={handleSelect}
          onAddRemarkClick={handleSelect}
          isPending={isPending}
        />
      </div>
    );
  },
);
CandidateRow.displayName = 'CandidateRow';

// --- 3. Define Item Content Function OUTSIDE Component ---
// This function is static and never recreated. It receives `context` as the 3rd arg.
function renderCandidateItem(
  index: number,
  candidate: Candidate,
  context: CandidateContextType,
) {
  const isPending = context.pendingMoves.some(
    (pm) =>
      pm.candidateId === candidate._id && pm.targetLaneId === context.laneId,
  );

  return (
    <CandidateRow
      candidate={candidate}
      index={index}
      isPending={isPending}
      context={context}
    />
  );
}

const KanbanColumn = memo(
  ({
    column,
    index,
    isFileOver,
    setIsFileOver,
    handleFileDrop,
    isDragging,
    handleDeleteLane,
    handleEditLane,
    setLaneToDelete,
    setLaneToEdit,
    refetch,
    setSelectedCandidate,
    setIsDetailsOpen,
    openRemarksFor,
    setOpenRemarksFor,
    handleDeleteClick,
    onConfigureChecklist,
    pendingMoves = [],
    laneConfig,
  }: KanbanColumnProps) => {
    const [isLaneOptionsOpen, setIsLaneOptionsOpen] = useState<boolean>(false);
    const [isLaneOpsOpenFor, setIsLaneOpsOpenFor] = useState<string | null>(
      null,
    );
    const user = useAppSelector((state) => state.auth.user);

    const [sortConfig, setSortConfig] = useState<SortConfig>({
      field: null,
      direction: 'asc',
      enabled: true,
    });

    const pathname = usePathname();
    const jobId = pathname?.split('/')[3];
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    // --- 4. Create Memoized Context ---
    // This object bundles all the dynamic props needed by the list items
    const contextValue = useMemo<CandidateContextType>(
      () => ({
        laneId: column.id,
        pendingMoves,
        refetch,
        openRemarksFor,
        setOpenRemarksFor,
        setSelectedCandidate,
        handleDeleteClick,
        setIsDetailsOpen,
      }),
      [
        column.id,
        pendingMoves,
        refetch,
        openRemarksFor,
        setOpenRemarksFor,
        setSelectedCandidate,
        handleDeleteClick,
        setIsDetailsOpen,
      ],
    );

    const sortCandidates = useCallback(
      (
        candidates: Candidate[],
        field: string,
        direction: 'asc' | 'desc',
      ): Candidate[] =>
        [...candidates].sort((a, b) => {
          const getValue = (
            candidate: Candidate,
            fieldToUse: string,
          ): string | number | Date | null | undefined => {
            switch (fieldToUse) {
              case 'name':
                return candidate.name?.toLowerCase() || '';
              case 'email':
                return candidate.email?.toLowerCase() || '';
              case 'ctc':
                return candidate.currentCTC ?? 0;
              case 'expectedCtc':
                return candidate.expectedCTC ?? 0;
              case 'experience':
                return typeof candidate.experience === 'number'
                  ? candidate.experience
                  : parseInt(candidate.experience as string, 10) || 0;
              case 'skills':
                return Array.isArray(candidate.skills)
                  ? candidate.skills.length
                  : 0;
              case 'appliedDate':
                return candidate.tracking?.createdAt
                  ? new Date(candidate.tracking?.createdAt as string).getTime()
                  : 0;
              case 'assignmentDate':
                return candidate.assignment?.time
                  ? new Date(candidate.assignment?.time).getTime()
                  : 0;
              case 'noticePeriod':
                return candidate.noticePeriod
                  ? new Date(candidate.noticePeriod).getTime()
                  : 0;
              case 'aiScore':
                return candidate.scores?.overall
                  ? new Date(candidate.scores.overall).getTime()
                  : 0;
              case 'followupDate':
                return candidate?.followUp?.date
                  ? new Date(candidate?.followUp?.date).getTime()
                  : 0;
              case 'createdAt':
                return candidate.tracking?.createdAt
                  ? new Date(candidate.tracking?.createdAt).getTime()
                  : 0;
              case 'lastModified': {
                const updatedAt = getTrackingDate(candidate, 'updatedAt');
                const createdAt = getTrackingDate(candidate, 'createdAt');
                if (updatedAt) {
                  return updatedAt.getTime();
                }
                if (createdAt) {
                  return createdAt.getTime();
                }
                return 0;
              }
              default:
                return '';
            }
          };

          const aValue = getValue(a, field);
          const bValue = getValue(b, field);

          if (aValue && bValue && aValue < bValue)
            return direction === 'asc' ? -1 : 1;
          if (aValue && bValue && aValue > bValue)
            return direction === 'asc' ? 1 : -1;
          return 0;
        }),
      [],
    );

    const processedCandidates = useMemo(() => {
      const filtered = column.candidates.filter((candidate) => {
        const candidateJobId = getJobId(candidate)?.toString() || '';
        return candidateJobId === jobId?.toString();
      });

      if (!sortConfig.enabled || !sortConfig.field) {
        return filtered;
      }

      return sortCandidates(filtered, sortConfig.field, sortConfig.direction);
    }, [column.candidates, jobId, sortConfig, sortCandidates]);

    const handleSort = useCallback(
      (field: string, direction: 'asc' | 'desc') => {
        setSortConfig({ field, direction, enabled: true });
      },
      [],
    );

    const handleDragStart = useCallback(() => {
      setSortConfig((prev) => ({ ...prev, enabled: false }));
    }, []);

    return (
      <Draggable draggableId={column.id} index={index} isDragDisabled={false}>
        {(provided: DraggableProvided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`min-w-[450px] flex-1 ${index === 0 ? 'pl-0 pr-1' : 'px-1'}`}
            style={{
              ...provided.draggableProps.style,
              userSelect: 'none',
            }}
          >
            <div className="flex h-full w-full min-w-0 max-w-full flex-col rounded-xl border border-gray-200/50 bg-white/70 p-2 shadow-sm dark:border-gray-700/50 dark:bg-black/30">
              <div className="mb-2 flex-shrink-0 px-2 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      role="button"
                      tabIndex={0}
                      {...provided.dragHandleProps}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDragStart();
                        provided.dragHandleProps?.onMouseDown?.(e);
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      {column.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {laneConfig?.incomingChecklist && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                className="flex cursor-pointer items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfigureChecklist?.(
                                    column.id,
                                    column.title,
                                    'incoming',
                                  );
                                }}
                              >
                                <ArrowRightToLine className="h-3.5 w-3.5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-black dark:text-gray-100">
                              <p className="text-xs">
                                Incoming checklist:{' '}
                                {laneConfig.incomingChecklist.name}
                                {laneConfig.incomingChecklist.isMandatory &&
                                  ' (Mandatory)'}
                                <br />
                                {user?.role !== 'hr' && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Click to configure
                                  </span>
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {laneConfig?.outgoingChecklist && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                className="flex cursor-pointer items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfigureChecklist?.(
                                    column.id,
                                    column.title,
                                    'outgoing',
                                  );
                                }}
                              >
                                <ArrowLeftFromLine className="h-3.5 w-3.5 scale-x-[-1]" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-black dark:text-gray-100">
                              <p className="text-xs">
                                Outgoing checklist:{' '}
                                {laneConfig.outgoingChecklist.name}
                                {laneConfig.outgoingChecklist.isMandatory &&
                                  ' (Mandatory)'}
                                <br />
                                <span className="text-blue-600 dark:text-blue-400">
                                  Click to configure
                                </span>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <span className="min-w-[24px] rounded-full bg-white px-2 py-1 text-center text-xs font-medium text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-400">
                      {processedCandidates.length}
                    </span>
                    <LaneOptionsMenu
                      laneId={column.id}
                      laneName={column.title}
                      onSort={handleSort}
                      handleDeleteLane={handleDeleteLane}
                      setLaneToDelete={setLaneToDelete}
                      setLaneToEdit={setLaneToEdit}
                      onEdit={handleEditLane}
                      onConfigureChecklist={onConfigureChecklist}
                      isOpen={
                        isLaneOptionsOpen && column.id === isLaneOpsOpenFor
                      }
                      setIsOpen={(open) => {
                        setIsLaneOptionsOpen(open);
                        setIsLaneOpsOpenFor(open ? column.id : null);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2 overflow-hidden pr-2">
                <Droppable droppableId={column.id} type="candidate">
                  {(droppableProvided: DroppableProvided) => (
                    <div
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      className="relative h-full"
                      onDragOver={(e) => {
                        if (
                          e.dataTransfer.types.includes('Files') &&
                          column.id === 'applied'
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsFileOver(true);
                          e.dataTransfer.dropEffect = 'link';
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsFileOver(false);
                        e.dataTransfer.dropEffect = 'none';
                      }}
                      onDrop={(e) => {
                        if (e.dataTransfer.types.includes('Files')) {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsFileOver(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) handleFileDrop(files[0]);
                        }
                      }}
                    >
                      {isFileOver && column.id === 'applied' && (
                        <div className="pointer-events-none absolute z-10 h-full w-full rounded-lg border border-dashed border-gray-500 bg-gray-200/50">
                          <div className="animate-fade-in pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-md bg-black p-2 text-lg font-semibold text-white shadow-lg">
                            Drop file here!
                          </div>
                        </div>
                      )}

                      <CustomScrollbarLane
                        isDragging={isDragging}
                        className="h-full"
                        scrollerRef={scrollerRef}
                      >
                        {/* --- 5. Pass Context to Virtuoso --- */}
                        <Virtuoso
                          style={{ height: '100%', scrollbarWidth: 'none' }}
                          data={processedCandidates}
                          increaseViewportBy={{ bottom: 250, top: 100 }}
                          scrollerRef={(el) => {
                            if (el) scrollerRef.current = el as HTMLDivElement;
                          }}
                          computeItemKey={(_index, candidate) => candidate._id}
                          // Pass the static function here
                          itemContent={renderCandidateItem}
                          // Pass the memoized context here
                          context={contextValue}
                        />
                      </CustomScrollbarLane>

                      {droppableProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  },
);
export { KanbanColumn };
