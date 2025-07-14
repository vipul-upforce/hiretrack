import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { CandidateScoreBadge } from "../Utils/candidate-score-badge";
import ExpandableDescription from "../Utils/expand-collapse-desc";
import { Candidate } from "@/types/candidate";
import useRoles from "@/hooks/useRoles";

interface ResumeEvaluationDetailsProps {
  labelClass: string;
  localCandidate: Candidate;
  isReEvaluating: boolean;
  isEvaluatingFor: string;
  onReEvaluate: () => void;
}

export default function ResumeEvaluationDetails({
  labelClass,
  localCandidate,
  isReEvaluating,
  isEvaluatingFor,
  onReEvaluate,
}: ResumeEvaluationDetailsProps) {
  const [showEvalDetails, setShowEvalDetails] = useState(false);
  // const [isReEvaluating, setIsReEvaluating] = useState(false);
  const role = useRoles();
  if (!localCandidate.scores) return null;

  return (
    <>
      <div
        className="space-y-2 cursor-pointer"
        onClick={() => setShowEvalDetails(!showEvalDetails)}
      >
        <div className="space-y-2 cursor-pointer">
          <div className="flex flex-row justify-between items-center">
            <div className="flex items-center gap-3">
              <Label className={labelClass}>AI Evaluation</Label>
              {role !== "candidate" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    // console.log("%%%%%%");
                    onReEvaluate();
                    // handleReEvaluate();
                  }}
                  disabled={
                    isReEvaluating && isEvaluatingFor === localCandidate._id
                  }
                  className={
                    isReEvaluating && isEvaluatingFor === localCandidate._id
                      ? "animate-spin"
                      : "hover:text-gray-400 transition duration-300"
                  }
                >
                  <RefreshCwIcon size={15} />
                </Button>
              )}
            </div>
            {localCandidate.scores.overall !== undefined && (
              <p>{showEvalDetails ? "Hide details" : "Show details"}</p>
            )}
          </div>

          {localCandidate.scores.overall !== undefined ? (
            <div className="capitalize flex gap-2 py-2">
              {localCandidate.scores.overall >= 0 && (
                <CandidateScoreBadge
                  score={localCandidate.scores.overall}
                  category="Overall"
                />
              )}
              {localCandidate.scores.experience >= 0 && (
                <CandidateScoreBadge
                  score={localCandidate.scores.experience}
                  category="Experience"
                />
              )}
              {localCandidate.scores.skills >= 0 && (
                <CandidateScoreBadge
                  score={localCandidate.scores.skills}
                  category="Skills"
                />
              )}
              {localCandidate.scores.affordability >= 0 && (
                <CandidateScoreBadge
                  score={localCandidate.scores.affordability}
                  category="Affordability"
                />
              )}
            </div>
          ) : (
            <p className="text-gray-500">
              This candidate has not been evaluated yet.
            </p>
          )}
        </div>
      </div>

      {showEvalDetails && localCandidate.scores.strengths?.length > 0 && (
        <div className="space-y-1">
          <Label className={labelClass}>Strengths</Label>
          <ExpandableDescription
            description={
              <ul className="list-disc pl-5">
                {localCandidate.scores.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            }
            open
          />
        </div>
      )}

      {showEvalDetails &&
        localCandidate.scores.areas_for_improvement?.length > 0 && (
          <div className="space-y-1">
            <Label className={labelClass}>Areas for Improvement</Label>
            <ExpandableDescription
              description={
                <ul className="list-disc pl-5">
                  {localCandidate.scores.areas_for_improvement.map(
                    (area, index) => (
                      <li key={index}>{area}</li>
                    )
                  )}
                </ul>
              }
              open
            />
          </div>
        )}

      {showEvalDetails && localCandidate.scores.recommendation && (
        <div className="space-y-2">
          <Label className={labelClass}>Recommendation</Label>
          <p>{localCandidate.scores.recommendation}</p>
        </div>
      )}

      {showEvalDetails && localCandidate.scores.notes && (
        <div className="space-y-1">
          <Label className={labelClass}>Note</Label>
          <ExpandableDescription
            description={localCandidate.scores.notes}
            open
          />
        </div>
      )}
    </>
  );
}
