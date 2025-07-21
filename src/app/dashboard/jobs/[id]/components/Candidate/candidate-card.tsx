"use client";

import { Draggable, DraggableProvided } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchiveRestore, Info, Trash2 } from "lucide-react";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import AddRemarksPopover from "../Dialogs/add-remark-dialog";
import RemarksPopover from "../Remarks/remarks-popover";
import { CandidateScoreBadge } from "../Utils/candidate-score-badge";
import FollowupDisplay from "../Remarks/followup-popover";
import { useRemarkHandlers } from "../../hooks/useRemarkHandlers";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { User } from "@/lib/features/users/usersApi";
import TagsList from "@/components/ui/tagsList";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import CustomFieldBadge from "./CustomFieldBadge";

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate: Candidate) => void;
  onDashboard?: boolean;
  onDeleteClick?: (candidateId: string) => void;
  openRemarks: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
}

export function CandidateCard({
  candidate,
  index,
  onViewDetails,
  openRemarks,
  setOpenRemarksFor,
  refetch,
  onDashboard = false,
  onDeleteClick,
}: CandidateCardProps) {
  const { formNameObject } = useCustomForm("Candidate");
  const [user, setUser] = useState<User | null>(null);
  const { handleRemoveFollowUp } = useRemarkHandlers(candidate, user, refetch);

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  const renderCardContent = () => (
    <div className="flex flex-col">
      <div className="flex justify-between items-start">
        <h3 className="font-medium w-2/5 text-wrap break-words ">
          {candidate.tags ? <TagsList candidate={candidate} /> : null}
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
          {!onDashboard && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${candidate.isDeleted ? "text-blue-500 hover:text-blue-500/90" : "text-destructive hover:text-destructive/90"}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick?.(candidate._id);
              }}
            >
              {candidate.isDeleted ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <RemarksPopover
            candidate={candidate}
            onMoreClick={() => onViewDetails(candidate)}
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

      <div className="mt-2">
        <p className="text-sm text-muted-foreground text-wrap break-words">
          {candidate.experience} years • {candidate.location}
        </p>
        <div className="flex flex-row w-full justify-between items-center">
          <p className="text-sm text-muted-foreground text-wrap break-words">
            {candidate.expectedCTC} LPA
          </p>
          {candidate.followUp && candidate.followUp.note && (
            <div className="flex justify-end ml-2">
              <FollowupDisplay
                note={candidate.followUp.note as string}
                date={
                  candidate.followUp.date && candidate.followUp.date.length > 1
                    ? new Date(candidate.followUp.date)
                    : null
                }
                handleRemoveFollowUp={handleRemoveFollowUp}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {candidate.skills.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="secondary" className="text-xs break-all">
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
            <Badge>{formatDate(candidate.assignment?.time)}</Badge>
          )}
          {candidate.assignment?.time && (
            <Badge>{formatTime(candidate.assignment?.time)}</Badge>
          )}
        </div>
      )}

      {candidate.scores && candidate.scores.overall !== undefined && (
        <div className="capitalize flex gap-2 py-2 flex-wrap justify-start">
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
          {candidate.scores.affordability >= 0 && (
            <CandidateScoreBadge
              score={candidate.scores.affordability}
              category="Affordability"
            />
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {candidate.customFields &&
          Object.entries(candidate.customFields)
            .filter(([key, value]) => {
              const field = formNameObject?.fields.find((f) => f.label === key);
              if (field?.candidateId && field.candidateId !== candidate._id)
                return false;
              if (
                (typeof value === "string" && value === "") ||
                (typeof value === "object" && Object.keys(value).length === 0)
              ) {
                return false;
              }
              return field?.showOnCard;
            })
            .map(([key, value], i) => (
              <div key={i}>
                <CustomFieldBadge kii={key} value={value} />
              </div>
            ))}
      </div>
    </div>
  );

  return onDashboard ? (
    <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow h-full">
      {renderCardContent()}
    </div>
  ) : (
    <Draggable draggableId={candidate._id} index={index}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-visible"
        >
          {renderCardContent()}
        </div>
      )}
    </Draggable>
  );
}
