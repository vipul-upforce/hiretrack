import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { CandidateScoreBadge } from "../Utils/candidate-score-badge";
import ExpandableDescription from "../Utils/expand-collapse-desc";
import { Candidate } from "@/types/candidate";

interface ResumeEvaluationDetailsProps {
  labelClass: string;
  localCandidate: Candidate;
  isReEvaluating: boolean;
  onReEvaluate: () => void;
}

export default function ResumeEvaluationDetails({
  labelClass,
  localCandidate,
  isReEvaluating,
  onReEvaluate,
}: ResumeEvaluationDetailsProps) {
  const [showEvalDetails, setShowEvalDetails] = useState(false);

  if (!localCandidate.scores) return null;

  const hasEvaluationData =
    localCandidate.scores.overall ||
    localCandidate.scores.experience ||
    localCandidate.scores.skills ||
    localCandidate.scores.strengths?.length > 0 ||
    localCandidate.scores.areas_for_improvement?.length > 0 ||
    localCandidate.scores.recommendation ||
    localCandidate.scores.notes;

  if (!hasEvaluationData) return null;

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
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("%%%%%%");
                  onReEvaluate();
                }}
                disabled={isReEvaluating}
                className={
                  isReEvaluating
                    ? "animate-spin"
                    : "hover:text-gray-400 transition duration-300"
                }
              >
                <RefreshCwIcon size={15} />
              </Button>
            </div>
            <p>{showEvalDetails ? "Hide details" : "Show details"}</p>
          </div>

          {localCandidate.scores.overall !== undefined && (
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
            </div>
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
