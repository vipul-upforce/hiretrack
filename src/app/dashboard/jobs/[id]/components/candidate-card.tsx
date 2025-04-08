"use client";

import { useState } from "react";
import { Draggable, DraggableProvided } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Trash2 } from "lucide-react";
import { Candidate } from "@/types/candidate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDeleteCandidateMutation } from "@/lib/features/candidate/candidateApi";
import { formatTime } from "./candidate-details-dialog";
import AddRemarksPopover from "./add-remark-dialog";
import RemarksPopover from "./remarks-popover";
import { CandidateScoreBadge } from "./candidate-score-badge";

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate: Candidate) => void;
  onDashboard?: boolean;
}

export function CandidateCard({
  candidate,
  index,
  onViewDetails,
  openRemarks,
  setOpenRemarksFor,
  refetch,
  onDashboard,
}: CandidateCardProps & {
  openRemarks: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [deleteCandidate, { isLoading: isDeleting }] =
    useDeleteCandidateMutation();

  const handleDelete = async () => {
    try {
      await deleteCandidate(candidate._id).unwrap();

      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete candidate",
        variant: "destructive",
      });
    }
  };

  // console.log(candidate)
  if (onDashboard) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <h3 className="font-medium w-2/3 text-wrap break-words">{candidate.name}</h3>
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
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {candidate.name}&apos;s
                    application. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            {candidate.assignment?.deadline && (
              <Badge>{candidate.assignment?.deadline.split("T")[0]}</Badge>
            )}
            {candidate.assignment?.deadline && (
              <Badge>{formatTime(candidate.assignment?.deadline)} </Badge>
            )}
          </div>
        )}
        {
          candidate.scores && candidate.scores.overall && (
            <div className="capitalize flex gap-2 py-2">
              <CandidateScoreBadge score={candidate.scores.overall} category="Overall" />
              <CandidateScoreBadge score={candidate.scores.experience} category="Exper" />
              <CandidateScoreBadge score={candidate.scores.skills} category="Skills" />
            </div>
          )
        }
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
        // style={{
        //   marginTop:`${index===0?"0px":"12px"}`
        // }}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-medium w-2/3 text-wrap break-words">{candidate.name}</h3>
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
              <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {candidate.name}&apos;s
                      application. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
              {candidate.assignment?.deadline && (
                <Badge>{candidate.assignment?.deadline.split("T")[0]}</Badge>
              )}
              {candidate.assignment?.deadline && (
                <Badge>{formatTime(candidate.assignment?.deadline)} </Badge>
              )}
            </div>
          )}
          {
            candidate.scores && candidate.scores.overall && (
              <div className="capitalize flex gap-2 py-2">
                <CandidateScoreBadge score={candidate.scores.overall} category="Overall" />
                <CandidateScoreBadge score={candidate.scores.experience} category="Exper" />
                <CandidateScoreBadge score={candidate.scores.skills} category="Skills" />
              </div>
            )
          }
        </div>
      )}
    </Draggable>
  );
}
