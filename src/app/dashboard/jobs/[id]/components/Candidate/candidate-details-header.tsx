import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Tag } from "lucide-react";
import { CandidateStatusBadge } from "../Utils/candidate-status-badge";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import TagsDialog from "../Dialogs/tags-dialog";
import { User } from "@/lib/features/users/usersApi";
import TagsList from "@/components/ui/tagsList";

interface DetailsDialogHeaderProps {
  candidate: Candidate;
  handleCandidateInfoCopy: (info: string) => void;
  user: User | null;
  refetch: () => void;
}

export default function DetailsDialogHeader({
  candidate,
  handleCandidateInfoCopy,
  user,
  refetch,
}: DetailsDialogHeaderProps) {
  return (
    <div>
      {candidate.tags ? <TagsList candidate={candidate} /> : null}
      <DialogTitle className="text-2xl font-semibold">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex gap-2 items-center">
              {candidate.name}{" "}
              {candidate.isDeleted ? (
                <Badge className={`bg-red-500`}>Archived</Badge>
              ) : null}
            </div>
            {candidate.email && (
              <div className="text-gray-500 font-thin text-sm flex flex-row items-center">
                {candidate.email}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6"
                  onClick={() => handleCandidateInfoCopy(candidate.email || "")}
                  title="Copy Email"
                >
                  <Copy size={14} />
                  <span className="sr-only">Copy Email</span>
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-6 w-6"
                      title="Tags"
                    >
                      <Tag size={14} />
                      <span className="sr-only">Tags</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <TagsDialog
                      user={user}
                      candidate={candidate}
                      refetch={refetch}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 px-8">
            <div className="text-right">
              {candidate?.assignment && (
                <div className="flex flex-col items-end">
                  <div className="text-sm font-bold">
                    {typeof candidate?.assignment?.interviewerId === "object" &&
                    candidate.assignment.interviewerId
                      ? candidate.assignment.interviewerId.name
                      : "Unknown Interviewer"}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>{formatDate(candidate?.assignment?.time)}</span>
                    <span>•</span>
                    <span>{formatTime(candidate?.assignment?.time)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <CandidateStatusBadge status={candidate?.status} />
              <p className="text-xs text-gray-500 line-clamp-2 text-end">
                {candidate?.jobId?.title}
              </p>
            </div>
          </div>
        </div>
      </DialogTitle>
    </div>
  );
}
