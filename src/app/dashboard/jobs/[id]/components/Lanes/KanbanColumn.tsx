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
import {
  useState, useMemo, memo, useCallback, useRef,
} from 'react';
import { usePathname } from 'next/navigation';
import { Virtuoso } from 'react-virtuoso';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ILaneConfig } from '@/lib/models/JobLaneConfig';
import CustomScrollbarLane from '@/components/ui/custom-scrollbar-lane';
import { getJobId, getTrackingDate } from '../../utils/candidateAccessors';
import { LaneOptionsMenu } from './lanes-options-menu';
import { CandidateCard } from '../Candidate/candidate-card';

interface PendingMove {
  candidateId: string;
  sourceLaneId: string;
  targetLaneId: string;
  sourceIndex: number;
  targetIndex: number;
}

interface SortConfig {
  field: string | null;
  direction: 'asc' | 'desc';
  enabled: boolean;
}

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    candidates: Candidate[];
  };
  index: number;
  isFileOver: boolean;
  setIsFileOver: (value: boolean) => void;
  handleFileDrop: (file: File) => void;
  handleDeleteLane: () => void;
  handleEditLane: () => void;
  setLaneToDelete: (laneId: string) => void;
  setLaneToEdit: (laneId: string) => void;
  refetch: () => void;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (value: boolean) => void;
  openRemarksFor: string | null;
  setOpenRemarksFor: (candidateId: string | null) => void;
  handleDeleteClick: (candidateId: string) => void;
  onConfigureChecklist?: (
    laneId: string,
    laneName: string,
    initialTab?: 'incoming' | 'outgoing'
  ) => void;
  isDragging?: boolean;
  pendingMoves?: PendingMove[];
  laneConfig?: ILaneConfig;
}

const KanbanColumn = memo(({
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
  selectedCandidate,
  setSelectedCandidate,
  isDetailsOpen,
  setIsDetailsOpen,
  openRemarksFor,
  setOpenRemarksFor,
  handleDeleteClick,
  onConfigureChecklist,
  pendingMoves = [],
  laneConfig,
}: KanbanColumnProps) => {
  const [isLaneOptionsOpen, setIsLaneOptionsOpen] = useState<boolean>(false);
  const [isLaneOpsOpenFor, setIsLaneOpsOpenFor] = useState<string | null>(null);

  // Simplified sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: 'asc',
    enabled: true,
  });

  const pathname = usePathname();
  const jobId = pathname?.split('/')[3];
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Simplified sort function
  const sortCandidates = useCallback(
    (
      candidates: Candidate[],
      field: string,
      direction: 'asc' | 'desc',
    ): Candidate[] => [...candidates].sort((a, b) => {
      const getValue = (candidate: Candidate, field: string): string | number | Date | null | undefined => {
        switch (field) {
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
              : parseInt(candidate.experience as string) || 0;
          case 'skills':
            return Array.isArray(candidate.skills)
              ? candidate.skills.length
              : 0;
          case 'appliedDate':
            return candidate.appliedDate
              ? new Date(candidate.appliedDate).getTime()
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
          case 'lastModified':
            const updatedAt = getTrackingDate(candidate, 'updatedAt');
            const createdAt = getTrackingDate(candidate, 'createdAt');
            return updatedAt
              ? updatedAt.getTime()
              : createdAt
                ? createdAt.getTime()
                : 0;
          default:
            return '';
        }
      };

      const aValue = getValue(a, field);
      const bValue = getValue(b, field);

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    }),
    [],
  );

  // Single source of truth for processed candidates
  const processedCandidates = useMemo(() => {
    // First filter by jobId
    const filtered = column.candidates.filter((candidate) => {
      const candidateJobId = getJobId(candidate)?.toString() || '';
      return candidateJobId === jobId?.toString();
    });

    // Then sort if enabled and field is selected
    if (!sortConfig.enabled || !sortConfig.field) {
      return filtered;
    }

    return sortCandidates(filtered, sortConfig.field, sortConfig.direction);
  }, [column.candidates, jobId, sortConfig, sortCandidates]);

  // Handle sort from LaneOptionsMenu
  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSortConfig({ field, direction, enabled: true });
  }, []);

  // Disable sorting during drag operations
  const handleDragStart = useCallback(() => {
    setSortConfig((prev) => ({ ...prev, enabled: false }));
  }, []);

  // Memoized event handlers
  const handleViewDetails = useCallback(
    (candidate: any) => {
      setSelectedCandidate(candidate);
      setIsDetailsOpen(true);
    },
    [setSelectedCandidate, setIsDetailsOpen],
  );

  const handleDeleteClickMemo = useCallback(
    (id: string, candidate: any) => {
      setSelectedCandidate(candidate);
      handleDeleteClick(id);
    },
    [setSelectedCandidate, handleDeleteClick],
  );

  return (
    <Draggable draggableId={column.id} index={index} isDragDisabled={false}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex-1 min-w-[450px] ${index === 0 ? 'pl-0 pr-1' : 'px-1'}`}
          style={{
            ...provided.draggableProps.style,
            userSelect: 'none',
          }}
        >
          <div className="h-full flex flex-col bg-white/70 dark:bg-black/30 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-2 min-w-0 w-full max-w-full">
            <div className="py-2 flex-shrink-0 px-2 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
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
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 truncate">
                    {column.title}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Checklist Indicators */}
                  <div className="flex items-center space-x-1">
                    {laneConfig?.incomingChecklist && (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
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
                          <TooltipContent className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            <p className="text-xs">
                              Incoming checklist:
                              {' '}
                              {laneConfig.incomingChecklist.name}
                              {laneConfig.incomingChecklist.isMandatory
                                && ' (Mandatory)'}
                              <br />
                              <span className="text-blue-600 dark:text-blue-400">
                                Click to configure
                              </span>
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
                              className="flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
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
                          <TooltipContent className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            <p className="text-xs">
                              Outgoing checklist:
                              {' '}
                              {laneConfig.outgoingChecklist.name}
                              {laneConfig.outgoingChecklist.isMandatory
                                && ' (Mandatory)'}
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
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full min-w-[24px] text-center shadow-sm">
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
                    isOpen={isLaneOptionsOpen && column.id === isLaneOpsOpenFor}
                    setIsOpen={(open) => {
                      setIsLaneOptionsOpen(open);
                      setIsLaneOpsOpenFor(open ? column.id : null);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Virtualized List Container */}
            <div className="flex-1 overflow-hidden space-y-2 pr-2 min-w-0">
              <Droppable droppableId={column.id} type="candidate">
                {(provided: DroppableProvided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="h-full relative"
                    onDragOver={(e) => {
                      if (
                        e.dataTransfer.types.includes('Files')
                        && column.id === 'applied'
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
                      <div className="absolute bg-gray-200/50 h-full w-full border border-dashed border-gray-500 rounded-lg pointer-events-none z-10">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-md shadow-lg text-lg font-semibold pointer-events-none animate-fade-in">
                          Drop file here!
                        </div>
                      </div>
                    )}

                    <CustomScrollbarLane
                      isDragging={isDragging}
                      className="h-full"
                      scrollerRef={scrollerRef}
                    >
                      <Virtuoso
                        style={{ height: '100%', scrollbarWidth: 'none' }}
                        data={processedCandidates}
                        increaseViewportBy={{ bottom: 250, top: 100 }}
                        scrollerRef={() => scrollerRef}
                        computeItemKey={(index, candidate) => candidate._id}
                        itemContent={(index, candidate) => {
                          const isPending = pendingMoves.some(
                            (pm) => pm.candidateId === candidate._id
                              && pm.targetLaneId === column.id,
                          );

                          return (
                            <div className="pb-2">
                              <CandidateCard
                                key={candidate._id}
                                candidate={candidate}
                                index={index}
                                refetch={refetch}
                                onViewDetails={handleViewDetails}
                                openRemarks={openRemarksFor === candidate._id}
                                setOpenRemarksFor={setOpenRemarksFor}
                                onDeleteClick={(id: string) => handleDeleteClickMemo(id, candidate)}
                                onEditClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                }}
                                onAssignClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                }}
                                onMarkAsDoneClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                }}
                                onFollowUpClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                }}
                                onAddRemarkClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                }}
                                isPending={isPending}
                              />
                            </div>
                          );
                        }}
                      />
                    </CustomScrollbarLane>

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

export { KanbanColumn };
