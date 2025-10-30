import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { Candidate } from "@/types/candidate";
import useRoles from "@/hooks/useRoles";
import { AIReEvaluateTrigger } from "./AIReEvaluateTrigger";

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
  const [showEvalDetails, setShowEvalDetails] = useState(true);
  const role = useRoles();
  if (!localCandidate.scores)
    return (
      <AIReEvaluateTrigger
        labelClass={labelClass}
        role={role}
        onReEvaluate={onReEvaluate}
        isReEvaluating={isReEvaluating}
        isEvaluatingFor={isEvaluatingFor}
        localCandidate={localCandidate}
      />
    );

  if (
    !localCandidate.scores.strengths?.length &&
    !localCandidate.scores.notes &&
    !localCandidate.scores.areas_for_improvement?.length &&
    !localCandidate.scores.recommendation
  ) {
    return (
      <AIReEvaluateTrigger
        labelClass={labelClass}
        role={role}
        onReEvaluate={onReEvaluate}
        isReEvaluating={isReEvaluating}
        isEvaluatingFor={isEvaluatingFor}
        localCandidate={localCandidate}
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="space-y-2">
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
                      ? "animate-spin text-gray-400 dark:text-gray-500"
                      : "hover:text-gray-600 dark:hover:text-gray-300 transition duration-300 text-gray-500 dark:text-gray-400"
                  }
                >
                  <RefreshCwIcon size={15} />
                </Button>
              )}
            </div>
            {localCandidate.scores.overall !== undefined && (
              <p
                className="text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => setShowEvalDetails(!showEvalDetails)}
              >
                {showEvalDetails ? "Hide details" : "Show details"}
              </p>
            )}
          </div>

          {localCandidate.scores.overall === undefined && (
            <p className="text-gray-500 dark:text-gray-400">
              This candidate has not been evaluated yet.
            </p>
          )}
        </div>
      </div>

      {showEvalDetails && localCandidate.scores.strengths?.length > 0 && (
        <div className="space-y-1">
          <Label className={labelClass}>Strengths</Label>
          <ul className="list-disc pl-5">
            {localCandidate.scores.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {showEvalDetails &&
        localCandidate.scores.areas_for_improvement?.length > 0 && (
          <div className="space-y-1">
            <Label className={labelClass}>Areas for Improvement</Label>
            <ul className="list-disc pl-5">
              {localCandidate.scores.areas_for_improvement.map(
                (area, index) => (
                  <li key={index}>{area}</li>
                )
              )}
            </ul>
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
          <p>{localCandidate.scores.notes}</p>
        </div>
      )}
    </>
  );
}
