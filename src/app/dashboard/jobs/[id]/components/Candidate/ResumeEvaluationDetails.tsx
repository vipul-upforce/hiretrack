import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Award } from "lucide-react";
import { Candidate } from "@/types/candidate";
import useRoles from "@/hooks/useRoles";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [showSkillsMatrix, setShowSkillsMatrix] = useState(false);
  const role = useRoles();
  if (!localCandidate.scores) return null;

  if (
    !localCandidate.scores.strengths?.length &&
    !localCandidate.scores.notes &&
    !localCandidate.scores.areas_for_improvement?.length &&
    !localCandidate.scores.recommendation
  ) {
    return null;
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
                    onReEvaluate();
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

      {/* AI Source Attribution - Evidence for Scores */}
      {showEvalDetails && localCandidate.scores.evidenceLinks &&
       (localCandidate.scores.evidenceLinks.overall &&
        localCandidate.scores.evidenceLinks.overall !== 'N/A' &&
        localCandidate.scores.evidenceLinks.overall.toLowerCase() !== 'n/a' ||
        localCandidate.scores.evidenceLinks.skills &&
        localCandidate.scores.evidenceLinks.skills !== 'N/A' &&
        localCandidate.scores.evidenceLinks.skills.toLowerCase() !== 'n/a' ||
        localCandidate.scores.evidenceLinks.experience &&
        localCandidate.scores.evidenceLinks.experience !== 'N/A' &&
        localCandidate.scores.evidenceLinks.experience.toLowerCase() !== 'n/a' ||
        (role !== "interviewer" && localCandidate.scores.evidenceLinks.affordability &&
        localCandidate.scores.evidenceLinks.affordability !== 'N/A' &&
        localCandidate.scores.evidenceLinks.affordability.toLowerCase() !== 'n/a')) && (
        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <Label className={`${labelClass} text-gray-700 dark:text-gray-300`}>
              AI Source Attribution
            </Label>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Resume sections referenced by AI for each evaluation score
          </p>
          <div className="space-y-2">
            {/* Overall */}
            {localCandidate.scores.evidenceLinks.overall &&
             localCandidate.scores.evidenceLinks.overall !== 'N/A' &&
             localCandidate.scores.evidenceLinks.overall.toLowerCase() !== 'n/a' && (
              <div className="bg-white dark:bg-transparent p-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[90px]">Overall Fit:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {localCandidate.scores.evidenceLinks.overall}
                  </span>
                </div>
              </div>
            )}

            {/* Skills */}
            {localCandidate.scores.evidenceLinks.skills &&
             localCandidate.scores.evidenceLinks.skills !== 'N/A' &&
             localCandidate.scores.evidenceLinks.skills.toLowerCase() !== 'n/a' && (
              <div className="bg-white dark:bg-transparent p-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[90px]">Skills Match:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {localCandidate.scores.evidenceLinks.skills}
                  </span>
                </div>
              </div>
            )}

            {/* Experience */}
            {localCandidate.scores.evidenceLinks.experience &&
             localCandidate.scores.evidenceLinks.experience !== 'N/A' &&
             localCandidate.scores.evidenceLinks.experience.toLowerCase() !== 'n/a' && (
              <div className="bg-white dark:bg-transparent p-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[90px]">Experience:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {localCandidate.scores.evidenceLinks.experience}
                  </span>
                </div>
              </div>
            )}

            {/* Affordability - Hidden from interviewers */}
            {role !== "interviewer" &&
             localCandidate.scores.evidenceLinks.affordability &&
             localCandidate.scores.evidenceLinks.affordability !== 'N/A' &&
             localCandidate.scores.evidenceLinks.affordability.toLowerCase() !== 'n/a' && (
              <div className="bg-white dark:bg-transparent p-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[90px]">Affordability:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {localCandidate.scores.evidenceLinks.affordability}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills Verification Matrix */}
      {showEvalDetails && localCandidate.scores.skillsMatrix && (
        <Collapsible
          open={showSkillsMatrix}
          onOpenChange={setShowSkillsMatrix}
          className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-gray-100 dark:hover:bg-gray-800/50 p-2 rounded transition-colors">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <Label className={`${labelClass} cursor-pointer`}>
                Skills Verification Matrix
              </Label>
            </div>
            {showSkillsMatrix ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Detailed breakdown of required vs. present skills
            </p>

            {/* Required and Present */}
            {localCandidate.scores.skillsMatrix.requiredAndPresent &&
             localCandidate.scores.skillsMatrix.requiredAndPresent.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-sm">Required Skills Present ({localCandidate.scores.skillsMatrix.requiredAndPresent.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {localCandidate.scores.skillsMatrix.requiredAndPresent.map((skill, index) => (
                    <div key={index} className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-green-900 dark:text-green-100">{skill.skill}</span>
                        {skill.proficiencyLevel && (
                          <span className="text-xs bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                            {skill.proficiencyLevel}
                          </span>
                        )}
                      </div>
                      {skill.yearsOfExperience !== undefined && (
                        <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                          {skill.yearsOfExperience} years experience
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {skill.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required but Missing */}
            {localCandidate.scores.skillsMatrix.requiredButMissing &&
             localCandidate.scores.skillsMatrix.requiredButMissing.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h4 className="font-semibold text-sm">Required Skills Missing ({localCandidate.scores.skillsMatrix.requiredButMissing.length})</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localCandidate.scores.skillsMatrix.requiredButMissing.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm border border-red-200 dark:border-red-900"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Present but Not Required */}
            {localCandidate.scores.skillsMatrix.presentButNotRequired &&
             localCandidate.scores.skillsMatrix.presentButNotRequired.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-sm">Additional Skills ({localCandidate.scores.skillsMatrix.presentButNotRequired.length})</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localCandidate.scores.skillsMatrix.presentButNotRequired.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-200 dark:border-blue-900"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Textual AI Evaluation Details */}
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

      {/* Red Flags Detection */}
      {showEvalDetails && localCandidate.scores.redFlags && localCandidate.scores.redFlags.length > 0 && (
        <Collapsible
          open={showRedFlags}
          onOpenChange={setShowRedFlags}
          className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50 dark:bg-red-950/20"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <Label className={`${labelClass} cursor-pointer text-red-700 dark:text-red-300`}>
                Red Flags ({localCandidate.scores.redFlags.length})
              </Label>
            </div>
            {showRedFlags ? (
              <ChevronUp className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-3">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Potential concerns detected during AI evaluation
            </p>
            {localCandidate.scores.redFlags.map((flag, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  flag.severity === 'high'
                    ? 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                    : flag.severity === 'medium'
                    ? 'bg-orange-100 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800'
                    : 'bg-yellow-100 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                        flag.severity === 'high'
                          ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : flag.severity === 'medium'
                          ? 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                          : 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {flag.severity}
                      </span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {flag.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {flag.description}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {flag.evidence}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
