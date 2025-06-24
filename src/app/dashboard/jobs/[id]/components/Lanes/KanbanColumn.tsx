"use client";

import {
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
} from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { CandidateCard } from "../Candidate/candidate-card";
import { Candidate } from "@/types/candidate"; // Adjust path as needed
import { LaneOptionsMenu } from "./lanes-options-menu";
import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";

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
}

type SortField = string;
type SortDirection = "asc" | "desc";

export function KanbanColumn({
  column,
  index,
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
}: KanbanColumnProps) {
  const [isLaneOptionsOpen, setIsLaneOptionsOpen] = useState(false);
  const [isLaneOpsOpenFor, setIsLaneOpsOpenFor] = useState<string | null>();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  // const [jobId, setJobId] = useState<string>();
  // Sorting function
  const pathname = usePathname();
  const jobId = pathname?.split("/")[3];
  const sortCandidates = (
    candidates: Candidate[],
    field: SortField,
    direction: SortDirection
  ): Candidate[] => {
    return [...candidates].sort((a, b) => {
      let aValue: any;
      let bValue: any;

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
          aValue = a.currentCTC || 0;
          bValue = b.currentCTC || 0;
          break;
        case "expectedCtc":
          aValue = a.expectedCTC || 0;
          bValue = b.expectedCTC || 0;
          break;
        case "experience":
          // Assuming experience is stored as a number (years) or string
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
          // Sort by number of skills or first skill alphabetically
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

      // Handle comparison
      if (aValue < bValue) {
        return direction === "asc" ? 1 : -1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? -1 : 1;
      }
      return 0;
    });
  };

  // Memoized sorted candidates
  const sortedCandidates = useMemo(() => {
    if (!sortField) {
      return column.candidates;
    }
    return sortCandidates(column.candidates, sortField, sortDirection);
  }, [column.candidates, sortField, sortDirection]);

  // Handle sort from LaneOptionsMenu
  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  return (
    <Draggable key={column.id} draggableId={column.id} index={index}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="w-[350px] mr-6"
        >
          <Card className="space-y-4 min-h-[75vh] h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center space-x-2">
                  <div {...provided.dragHandleProps}>
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle
                    className="text-lg font-semibold capitalize"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {column.title}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {/* ({column.candidates.length}) */}(
                      {
                        column.candidates.filter(
                          (candidate) =>
                            candidate?.jobId?._id?.toString() ===
                            jobId?.toString()
                        ).length
                      }
                      )
                    </span>
                    {/* {sortField && (
                      <span className="ml-1 text-xs text-blue-600">
                        ↑{sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )} */}
                  </CardTitle>
                </div>
                <LaneOptionsMenu
                  laneId={column.id}
                  onSort={handleSort}
                  handleDeleteLane={handleDeleteLane}
                  setLaneToDelete={setLaneToDelete}
                  setLaneToEdit={setLaneToEdit}
                  onEdit={handleEditLane}
                  isOpen={isLaneOptionsOpen && column.id === isLaneOpsOpenFor}
                  setIsOpen={(open) => {
                    setIsLaneOptionsOpen(open);
                    setIsLaneOpsOpenFor(open ? column.id || null : null);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="h-[89%]">
              <Droppable droppableId={column.id} type="candidate">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 min-h-full rounded-lg relative`}
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
                      <div className="absolute bg-gray-200/50 h-full w-full border border-dashed border-gray-500 rounded-lg pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-md shadow-lg text-lg font-semibold pointer-events-none animate-fade-in">
                          Drop file here!
                        </div>
                      </div>
                    )}
                    {sortedCandidates.map((candidate, index) => {
                      // debugger;
                      if (
                        // typeof candidate.jobId._id === "string" &&
                        candidate?.jobId?._id?.toString() !== jobId?.toString()
                      )
                        return;
                      return (
                        <CandidateCard
                          key={`${column.id}-${candidate._id}`}
                          candidate={candidate}
                          index={index}
                          refetch={refetch}
                          onViewDetails={(candidate) => {
                            setSelectedCandidate(candidate);
                            setIsDetailsOpen(true);
                          }}
                          openRemarks={openRemarksFor === candidate._id}
                          setOpenRemarksFor={setOpenRemarksFor}
                          onDeleteClick={(id: string) => {
                            setSelectedCandidate(candidate);
                            handleDeleteClick(id);
                          }}
                        />
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
