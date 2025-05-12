"use client";

import { Draggable, DraggableProvided } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchiveRestore, Info, Trash2 } from "lucide-react";
import { Candidate } from "@/types/candidate";
import { formatTime } from "../hooks/dateTimeFormatting";
import AddRemarksPopover from "./add-remark-dialog";
import RemarksPopover from "./remarks-popover";
import { CandidateScoreBadge } from "./candidate-score-badge";

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate: Candidate) => void;
  onDashboard?: boolean;
  onDeleteClick?: (candidateId: string) => void;
}

export function CandidateCard({
  candidate,
  index,
  onViewDetails,
  openRemarks,
  setOpenRemarksFor,
  refetch,
  onDashboard,
  onDeleteClick,
}: CandidateCardProps & {
  openRemarks: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
}) {
  if (onDashboard) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <h3 className="font-medium w-2/3 text-wrap break-words">
            {candidate.name}
          </h3>
          <div className="flex gap-1">
            <AddRemarksPopover
              candidate={candidate}
              isOpen={openRemarks}
              refetch={refetch}
              setOpenRemarksFor={setOpenRemarksFor}
              onOpenChange={(open) =>
                setOpenRemarksFor(open ? candidate._id : null)
              }
            />
          </div>
          <div className="flex gap-1">
            <RemarksPopover
              candidate={candidate}
              onMoreClick={() => {
                onViewDetails(candidate);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(candidate);
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground text-wrap break-words">
          <p>
            {candidate.experience} years • {candidate.location}
          </p>
          <p className="mt-1">{candidate.expectedCTC} LPA</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{candidate.skills.length - 3}
            </Badge>
          )}
        </div>
        {candidate.assignment && (
          <div className="capitalize flex gap-2 py-2">
            <Badge>
              {typeof candidate.assignment?.interviewerId === "object" &&
                candidate.assignment?.interviewerId?.name}
            </Badge>
            {candidate.assignment?.time && (
              <Badge>{candidate.assignment?.time.split("T")[0]}</Badge>
            )}
            {candidate.assignment?.time && (
              <Badge>{formatTime(candidate.assignment?.time)} </Badge>
            )}
          </div>
        )}
        {candidate.scores && candidate.scores.overall !== undefined && (
          <div className="capitalize flex gap-2 py-2">
            {candidate.scores.overall >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.overall}
                category="Overall"
              />
            )}
            {candidate.scores.experience >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.experience}
                category="Experience"
              />
            )}
            {candidate.scores.skills >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.skills}
                category="Skills"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Draggable draggableId={candidate._id} index={index}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <h3 className="font-medium w-2/3 text-wrap break-words">
              {candidate.name}
            </h3>
            <div className="flex gap-1">
              <AddRemarksPopover
                candidate={candidate}
                isOpen={openRemarks}
                refetch={refetch}
                setOpenRemarksFor={setOpenRemarksFor}
                onOpenChange={(open) =>
                  setOpenRemarksFor(open ? candidate._id : null)
                }
              />
            </div>
            <div className="flex gap-1">
              {!candidate.isDeleted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick?.(candidate._id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:text-blue-500/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick?.(candidate._id);
                  }}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              )}
              <RemarksPopover
                candidate={candidate}
                onMoreClick={() => {
                  onViewDetails(candidate);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(candidate);
                }}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground text-wrap break-words">
            <p>
              {candidate.experience} years • {candidate.location}
            </p>
            <p className="mt-1">{candidate.expectedCTC} LPA</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {candidate.skills.slice(0, 3).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-xs break-all"
              >
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{candidate.skills.length - 3}
              </Badge>
            )}
          </div>
          {candidate.assignment && (
            <div className="capitalize flex gap-2 py-2">
              <Badge>
                {typeof candidate.assignment?.interviewerId === "object" &&
                  candidate.assignment?.interviewerId?.name}
              </Badge>
              {candidate.assignment?.time && (
                <Badge>{candidate.assignment?.time.split("T")[0]}</Badge>
              )}
              {candidate.assignment?.time && (
                <Badge>{formatTime(candidate.assignment?.time)} </Badge>
              )}
            </div>
          )}
          {candidate.scores && candidate.scores.overall !== undefined && (
            <div className="capitalize flex gap-2 py-2">
              {candidate.scores.overall >= 0 && (
                <CandidateScoreBadge
                  score={candidate.scores.overall}
                  category="Overall"
                />
              )}
              {candidate.scores.experience >= 0 && (
                <CandidateScoreBadge
                  score={candidate.scores.experience}
                  category="Experience"
                />
              )}
              {candidate.scores.skills >= 0 && (
                <CandidateScoreBadge
                  score={candidate.scores.skills}
                  category="Skills"
                />
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
