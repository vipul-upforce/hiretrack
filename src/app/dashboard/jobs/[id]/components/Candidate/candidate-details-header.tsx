import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { CandidateStatusBadge } from "../Utils/candidate-status-badge";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";

interface DetailsDialogHeaderProps {
  candidate: Candidate;
  handleCandidateInfoCopy: (info: string) => void;
}

export default function DetailsDialogHeader({
  candidate,
  handleCandidateInfoCopy,
}: DetailsDialogHeaderProps) {
  return (
    <DialogTitle className="text-2xl font-semibold">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex gap-2 items-center">
            {candidate.name}{" "}
            {candidate.isDeleted && (
              <Badge className={`bg-red-500`}>Archived</Badge>
            )}
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
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pr-8">
          <div className="text-right">
            {candidate?.assignment && (
              <div className="flex flex-col items-end">
                <div className="text-sm font-bold">
                  {typeof candidate.assignment.interviewerId === "object" &&
                  candidate.assignment.interviewerId
                    ? candidate.assignment.interviewerId.name
                    : "Unknown Interviewer"}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span>{formatDate(candidate.assignment.time)}</span>
                  <span>•</span>
                  <span>{formatTime(candidate.assignment.time)}</span>
                </div>
              </div>
            )}
          </div>

          <CandidateStatusBadge status={candidate.status} />
        </div>
      </div>
    </DialogTitle>
  );
}
