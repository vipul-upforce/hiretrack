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
import { useState } from "react";

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
                    className="text-lg font-semibold"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {column.title}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({column.candidates.length})
                    </span>
                  </CardTitle>
                </div>
                {/* <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    handleDeleteLane();
                    setLaneToDelete(column.id);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button> */}
                <LaneOptionsMenu
                  laneId={column.id}
                  handleDeleteLane={handleDeleteLane}
                  setLaneToDelete={setLaneToDelete}
                  setLaneToEdit={setLaneToEdit}
                  onEdit={handleEditLane}
                  isOpen={isLaneOptionsOpen && column.id === isLaneOpsOpenFor}
                  setIsOpen={(open) => {
                    setIsLaneOptionsOpen(open);
                    setIsLaneOpsOpenFor(open ? column.id || "" : "");
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
                    {column.candidates.map((candidate, index) => (
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
                    ))}
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
