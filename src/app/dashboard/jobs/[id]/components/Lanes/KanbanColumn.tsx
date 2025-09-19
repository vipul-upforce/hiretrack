"use client";

import {
  Droppable,
  Draggable,
  type DroppableProvided,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableStateSnapshot,
  type DraggableRubric,
} from "@hello-pangea/dnd";
import {
  GripVertical,
  ArrowRightToLine,
  ArrowLeftFromLine,
} from "lucide-react";
import { CandidateCard } from "../Candidate/candidate-card";
import { Candidate } from "@/types/candidate";
import { LaneOptionsMenu } from "./lanes-options-menu";
import { useState, useMemo, memo, useCallback, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Virtuoso } from "react-virtuoso";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ILaneConfig } from "@/lib/models/JobLaneConfig";
import CustomScrollbarLane from "@/components/ui/custom-scrollbar-lane";

interface PendingMove {
  candidateId: string;
  sourceLaneId: string;
  targetLaneId: string;
  sourceIndex: number;
  targetIndex: number;
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
    initialTab?: "incoming" | "outgoing"
  ) => void;
  isDragging?: boolean;
  pendingMoves?: PendingMove[];
  laneConfig?: ILaneConfig;
}

type SortField = string;
type SortDirection = "asc" | "desc";

const KanbanColumn = memo(function KanbanColumn({
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
}: KanbanColumnProps) {
  const [isLaneOptionsOpen, setIsLaneOptionsOpen] = useState<boolean>(false);
  const [isLaneOpsOpenFor, setIsLaneOpsOpenFor] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  // Add state to temporarily suspend sorting after a drop
  const [suspendSorting, setSuspendSorting] = useState<boolean>(false);

  const pathname = usePathname();
  const jobId = pathname?.split("/")[3];
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const sortCandidates = (
    candidates: Candidate[],
    field: SortField,
    direction: SortDirection
  ): Candidate[] => {
    return [...candidates].sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      switch (field) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "email":
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
          break;
        case "ctc":
          aValue = a.currentCTC ?? 0;
          bValue = b.currentCTC ?? 0;
          break;
        case "expectedCtc":
          aValue = a.expectedCTC ?? 0;
          bValue = b.expectedCTC ?? 0;
          break;
        case "experience":
          aValue =
            typeof a.experience === "number"
              ? a.experience
              : parseInt(a.experience as string) || 0;
          bValue =
            typeof b.experience === "number"
              ? b.experience
              : parseInt(b.experience as string) || 0;
          break;
        case "skills":
          aValue = Array.isArray(a.skills) ? a.skills.length : 0;
          bValue = Array.isArray(b.skills) ? b.skills.length : 0;
          break;
        case "appliedDate":
          aValue = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
          bValue = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
          break;
        case "assignmentDate":
          aValue = a.assignment?.time
            ? new Date(a.assignment?.time).getTime()
            : 0;
          bValue = b.assignment?.time
            ? new Date(b.assignment?.time).getTime()
            : 0;
          break;
        case "noticePeriod":
          aValue = a.noticePeriod ? new Date(a.noticePeriod).getTime() : 0;
          bValue = b.noticePeriod ? new Date(b.noticePeriod).getTime() : 0;
          break;
        case "aiScore":
          aValue = a.scores?.overall ? new Date(a.scores.overall).getTime() : 0;
          bValue = b.scores?.overall ? new Date(b.scores.overall).getTime() : 0;
          break;
        case "followupDate":
          aValue = a?.followUp?.date
            ? new Date(a?.followUp?.date).getTime()
            : 0;
          bValue = b?.followUp?.date
            ? new Date(b?.followUp?.date).getTime()
            : 0;
          break;
        case "createdAt":
          aValue = a.tracking?.createdAt
            ? new Date(a.tracking?.createdAt).getTime()
            : 0;
          bValue = b.tracking?.createdAt
            ? new Date(b.tracking?.createdAt).getTime()
            : 0;
          break;
        case "lastModified":
          aValue = a.updatedAt
            ? new Date(a.updatedAt).getTime()
            : a.createdAt
              ? new Date(a.createdAt).getTime()
              : 0;
          bValue = b.updatedAt
            ? new Date(b.updatedAt).getTime()
            : b.createdAt
              ? new Date(b.createdAt).getTime()
              : 0;
          break;
        default:
          return 0;
      }

      if (aValue! < bValue!) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue! > bValue!) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Memoized sorted candidates with stable reference
  const sortedCandidates = useMemo(() => {
    // Don't sort if sorting is suspended or no sort field is set
    if (!sortField || suspendSorting) {
      return column.candidates;
    }

    const sorted = sortCandidates(column.candidates, sortField, sortDirection);
    return sorted;
  }, [column.candidates, sortField, sortDirection, suspendSorting]);

  // Memoized filtered candidates for this job
  const filteredCandidates = useMemo(() => {
    return sortedCandidates.filter((candidate) => {
      if (
        (typeof candidate.jobId !== "string" &&
          candidate?.jobId?._id?.toString() !== jobId?.toString()) ||
        (typeof candidate.jobId === "string" &&
          candidate?.jobId !== jobId?.toString())
      ) {
        return false;
      }
      return true;
    });
  }, [sortedCandidates, jobId]);

  // Track candidates count to detect when a new candidate is added
  const prevCandidatesCountRef = useRef(column.candidates.length);

  // Effect to detect when a new candidate is added to this column
  useEffect(() => {
    const currentCount = column.candidates.length;
    const prevCount = prevCandidatesCountRef.current;

    // If a candidate was added to this column
    if (currentCount > prevCount) {
      // Suspend sorting temporarily
      setSuspendSorting(true);

      // Resume sorting after a delay
      const timer = setTimeout(() => {
        setSuspendSorting(false);
      }, 500); // 500ms delay

      // Cleanup
      return () => clearTimeout(timer);
    }

    // Update the ref for next comparison
    prevCandidatesCountRef.current = currentCount;
  }, [column.candidates.length, column.id]);

  // Handle sort from LaneOptionsMenu - memoized to prevent re-renders
  const handleSort = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
    },
    []
  );

  // Memoized event handlers to prevent re-renders
  const handleViewDetails = useCallback(
    (candidate: any) => {
      setSelectedCandidate(candidate);
      setIsDetailsOpen(true);
    },
    [setSelectedCandidate, setIsDetailsOpen]
  );

  const handleDeleteClickMemo = useCallback(
    (id: string, candidate: any) => {
      setSelectedCandidate(candidate);
      handleDeleteClick(id);
    },
    [setSelectedCandidate, handleDeleteClick]
  );

  return (
    <Draggable draggableId={column.id} index={index} isDragDisabled={false}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex-1 min-w-[450px] ${index === 0 ? "pl-0 pr-1" : "px-1"}`}
          style={{
            ...provided.draggableProps.style,
            userSelect: "none",
            // opacity: snapshot.isDragging ? 0.8 : 1,
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
                                  "incoming"
                                );
                              }}
                            >
                              <ArrowRightToLine className="h-3.5 w-3.5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            <p className="text-xs">
                              Incoming checklist:{" "}
                              {laneConfig.incomingChecklist.name}
                              {laneConfig.incomingChecklist.isMandatory &&
                                " (Mandatory)"}
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
                                  "outgoing"
                                );
                              }}
                            >
                              <ArrowLeftFromLine className="h-3.5 w-3.5 scale-x-[-1]" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            <p className="text-xs">
                              Outgoing checklist:{" "}
                              {laneConfig.outgoingChecklist.name}
                              {laneConfig.outgoingChecklist.isMandatory &&
                                " (Mandatory)"}
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
                    {
                      column.candidates.filter(
                        (candidate) =>
                          candidate?.jobId?._id?.toString() ===
                          jobId?.toString()
                      ).length
                    }
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
                        e.dataTransfer.types.includes("Files") &&
                        column.id === "applied"
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsFileOver(true);
                        e.dataTransfer.dropEffect = "link";
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFileOver(false);
                      e.dataTransfer.dropEffect = "none";
                    }}
                    onDrop={(e) => {
                      if (e.dataTransfer.types.includes("Files")) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsFileOver(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) handleFileDrop(files[0]);
                      }
                    }}
                  >
                    {isFileOver && column.id === "applied" && (
                      <div className="absolute bg-gray-200/50 h-full w-full border border-dashed border-gray-500 rounded-lg pointer-events-none z-10">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-md shadow-lg text-lg font-semibold pointer-events-none animate-fade-in">
                          Drop file here!
                        </div>
                      </div>
                    )}

                    <CustomScrollbarLane
                      isDragging={isDragging}
                      className="h-full"
                      scrollerRef={scrollerRef} // Optional: pass this if needed
                    >
                      <Virtuoso
                        style={{ height: "100%", scrollbarWidth: "none" }}
                        data={filteredCandidates}
                        increaseViewportBy={{ bottom: 200, top: 100 }}
                        scrollerRef={() => scrollerRef}
                        // Use a stable key to prevent reordering issues
                        computeItemKey={(index, candidate) => candidate._id}
                        // Store the candidate ID as a data attribute for drag and drop
                        itemContent={(index, candidate) => {
                          // Store the original index of the candidate in the unsorted array
                          const originalIndex = column.candidates.findIndex(
                            (c) => c._id === candidate._id
                          );
                          const isPending = pendingMoves.some(
                            (pm) =>
                              pm.candidateId === candidate._id &&
                              pm.targetLaneId === column.id
                          );
                          return (
                            <div
                              className="pb-2"
                              data-candidate-id={candidate._id}
                              data-original-index={originalIndex}
                            >
                              <CandidateCard
                                key={candidate._id}
                                candidate={candidate}
                                index={
                                  originalIndex
                                } /* Use the original index for drag and drop */
                                refetch={refetch}
                                onViewDetails={handleViewDetails}
                                openRemarks={openRemarksFor === candidate._id}
                                setOpenRemarksFor={setOpenRemarksFor}
                                onDeleteClick={(id: string) =>
                                  handleDeleteClickMemo(id, candidate)
                                }
                                onEditClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                  console.log("Edit candidate:", candidate);
                                }}
                                onAssignClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                  console.log("Assign candidate:", candidate);
                                }}
                                onMarkAsDoneClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                  console.log("Mark as done:", candidate);
                                }}
                                onFollowUpClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                  console.log("Follow up:", candidate);
                                }}
                                onAddRemarkClick={(candidate) => {
                                  setSelectedCandidate(candidate);
                                  console.log("Add remark:", candidate);
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
