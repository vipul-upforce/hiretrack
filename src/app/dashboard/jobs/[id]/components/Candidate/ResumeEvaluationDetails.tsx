import { Fragment, ReactNode, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  RefreshCwIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import useRoles from '@/hooks/useRoles';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AIReEvaluateTrigger } from './AIReEvaluateTrigger';

interface ResumeEvaluationDetailsProps {
  labelClass: string;
  localCandidate: Candidate;
  isReEvaluating: boolean;
  isEvaluatingFor: string;
  onReEvaluate: () => void;
}

const SENSITIVE_BLUR_MARKER = '|||###|||';

function renderBlurredSensitiveNote(note: string): ReactNode {
  if (!note.includes(SENSITIVE_BLUR_MARKER)) {
    return note;
  }

  const segments = note.split(SENSITIVE_BLUR_MARKER);
  let offset = 0;

  return segments.map((segment) => {
    const segmentOffset = offset;
    offset += segment.length;
    const hasMaskedTokenAfter = offset < note.length;

    if (hasMaskedTokenAfter) {
      offset += SENSITIVE_BLUR_MARKER.length;
    }

    return (
      <Fragment key={`note-segment-${segmentOffset}`}>
        {segment}
        {hasMaskedTokenAfter && (
        <span
          aria-label="Sensitive value hidden"
          className="inline-block rounded bg-gray-300/70 px-2 text-gray-700 blur-[2px] dark:bg-gray-600/70 dark:text-gray-300"
        >
          ##
        </span>
      )}
      </Fragment>
    );
  });
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

  if (!localCandidate.scores) {
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
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className={labelClass}>AI Evaluation</Label>
              {role !== 'candidate' && role !== 'interviewer' && (
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
                      ? 'animate-spin text-gray-400 dark:text-gray-500'
                      : 'text-gray-500 transition duration-300 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                >
                  <RefreshCwIcon size={15} />
                </Button>
              )}
            </div>
            {localCandidate.scores.overall !== undefined && (
              <p
                className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowEvalDetails(!showEvalDetails)}
              >
                {showEvalDetails ? 'Hide details' : 'Show details'}
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
      {showEvalDetails &&
        localCandidate.scores.evidenceLinks &&
        ((localCandidate.scores.evidenceLinks.overall &&
          localCandidate.scores.evidenceLinks.overall !== 'N/A' &&
          localCandidate.scores.evidenceLinks.overall.toLowerCase() !==
          'n/a') ||
          (localCandidate.scores.evidenceLinks.skills &&
            localCandidate.scores.evidenceLinks.skills !== 'N/A' &&
            localCandidate.scores.evidenceLinks.skills.toLowerCase() !==
            'n/a') ||
          (localCandidate.scores.evidenceLinks.experience &&
            localCandidate.scores.evidenceLinks.experience !== 'N/A' &&
            localCandidate.scores.evidenceLinks.experience.toLowerCase() !==
            'n/a') ||
          (role !== 'interviewer' &&
            localCandidate.scores.evidenceLinks.affordability &&
            localCandidate.scores.evidenceLinks.affordability !== 'N/A' &&
            localCandidate.scores.evidenceLinks.affordability.toLowerCase() !==
            'n/a')) && (
          <div className="rounded-lg border bg-gray-50 p-3 dark:bg-gray-900/50">
            <div className="mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <Label
                className={`${labelClass} text-gray-700 dark:text-gray-300`}
              >
                AI Source Attribution
              </Label>
            </div>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Resume sections referenced by AI for each evaluation score
            </p>
            <div className="space-y-2">
              {/* Overall */}
              {localCandidate.scores.evidenceLinks.overall &&
                localCandidate.scores.evidenceLinks.overall !== 'N/A' &&
                localCandidate.scores.evidenceLinks.overall.toLowerCase() !==
                'n/a' && (
                  <div className="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-transparent">
                    <div className="flex items-start gap-2">
                      <span className="min-w-[90px] text-sm font-medium text-gray-500 dark:text-gray-400">
                        Overall Fit:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {localCandidate.scores.evidenceLinks.overall}
                      </span>
                    </div>
                  </div>
                )}

              {/* Skills */}
              {localCandidate.scores.evidenceLinks.skills &&
                localCandidate.scores.evidenceLinks.skills !== 'N/A' &&
                localCandidate.scores.evidenceLinks.skills.toLowerCase() !==
                'n/a' && (
                  <div className="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-transparent">
                    <div className="flex items-start gap-2">
                      <span className="min-w-[90px] text-sm font-medium text-gray-500 dark:text-gray-400">
                        Skills Match:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {localCandidate.scores.evidenceLinks.skills}
                      </span>
                    </div>
                  </div>
                )}

              {/* Experience */}
              {localCandidate.scores.evidenceLinks.experience &&
                localCandidate.scores.evidenceLinks.experience !== 'N/A' &&
                localCandidate.scores.evidenceLinks.experience.toLowerCase() !==
                'n/a' && (
                  <div className="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-transparent">
                    <div className="flex items-start gap-2">
                      <span className="min-w-[90px] text-sm font-medium text-gray-500 dark:text-gray-400">
                        Experience:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {localCandidate.scores.evidenceLinks.experience}
                      </span>
                    </div>
                  </div>
                )}

              {/* Affordability - Hidden from interviewers */}
              {role !== 'interviewer' &&
                localCandidate.scores.evidenceLinks.affordability &&
                localCandidate.scores.evidenceLinks.affordability !== 'N/A' &&
                localCandidate.scores.evidenceLinks.affordability.toLowerCase() !==
                'n/a' && (
                  <div className="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-transparent">
                    <div className="flex items-start gap-2">
                      <span className="min-w-[90px] text-sm font-medium text-gray-500 dark:text-gray-400">
                        Affordability:
                      </span>
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
      {showEvalDetails &&
        localCandidate.scores.skillsMatrix &&
        localCandidate.scores.skillsMatrix.requiredAndPresent &&
        localCandidate.scores.skillsMatrix.requiredAndPresent.length > 0 &&
        localCandidate.scores.skillsMatrix.requiredButMissing &&
        localCandidate.scores.skillsMatrix.requiredButMissing.length > 0 &&
        localCandidate.scores.skillsMatrix.presentButNotRequired &&
        localCandidate.scores.skillsMatrix.presentButNotRequired.length > 0 && (
          <Collapsible
            open={showSkillsMatrix}
            onOpenChange={setShowSkillsMatrix}
            className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50">
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
            <CollapsibleContent className="space-y-4 pt-4">
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Detailed breakdown of required vs. present skills
              </p>

              {/* Required and Present */}
              {localCandidate.scores.skillsMatrix.requiredAndPresent &&
                localCandidate.scores.skillsMatrix.requiredAndPresent.length >
                0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <h4 className="text-sm font-semibold">
                        Required Skills Present (
                        {
                          localCandidate.scores.skillsMatrix.requiredAndPresent
                            .length
                        }
                        )
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {localCandidate.scores.skillsMatrix.requiredAndPresent.map(
                        (skill) => (
                          <div
                            key={Math.random()}
                            className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                {skill.skill}
                              </span>
                              {skill.proficiencyLevel && (
                                <span className="rounded bg-green-200 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {skill.proficiencyLevel}
                                </span>
                              )}
                            </div>
                            {skill.yearsOfExperience !== undefined && (
                              <p className="mb-1 text-sm text-green-700 dark:text-green-300">
                                {skill.yearsOfExperience} years experience
                              </p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {skill.evidence}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Required but Missing */}
              {localCandidate.scores.skillsMatrix.requiredButMissing &&
                localCandidate.scores.skillsMatrix.requiredButMissing.length >
                0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <h4 className="text-sm font-semibold">
                        Required Skills Missing (
                        {
                          localCandidate.scores.skillsMatrix.requiredButMissing
                            .length
                        }
                        )
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {localCandidate.scores.skillsMatrix.requiredButMissing.map(
                        (skill) => (
                          <span
                            key={Math.random()}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                          >
                            {skill}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Present but Not Required */}
              {localCandidate.scores.skillsMatrix.presentButNotRequired &&
                localCandidate.scores.skillsMatrix.presentButNotRequired
                  .length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-semibold">
                        Additional Skills (
                        {
                          localCandidate.scores.skillsMatrix
                            .presentButNotRequired.length
                        }
                        )
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {localCandidate.scores.skillsMatrix.presentButNotRequired.map(
                        (skill) => (
                          <span
                            key={Math.random()}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300"
                          >
                            {skill}
                          </span>
                        ),
                      )}
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
            {localCandidate.scores.strengths.map((strength) => (
              <li key={Math.random()}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {showEvalDetails &&
        localCandidate.scores.areas_for_improvement?.length > 0 && (
          <div className="space-y-1">
            <Label className={labelClass}>Areas for Improvement</Label>
            <ul className="list-disc pl-5">
              {localCandidate.scores.areas_for_improvement.map((area) => (
                <li key={Math.random()}>{area}</li>
              ))}
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
          <p>{renderBlurredSensitiveNote(localCandidate.scores.notes)}</p>
        </div>
      )}

      {/* Red Flags Detection */}
      {showEvalDetails &&
        localCandidate.scores.redFlags &&
        localCandidate.scores.redFlags.length > 0 && (
          <Collapsible
            open={showRedFlags}
            onOpenChange={setShowRedFlags}
            className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <Label
                  className={`${labelClass} cursor-pointer text-red-700 dark:text-red-300`}
                >
                  Red Flags ({localCandidate.scores.redFlags.length})
                </Label>
              </div>
              {showRedFlags ? (
                <ChevronUp className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-4">
              <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                Potential concerns detected during AI evaluation
              </p>
              {localCandidate.scores.redFlags.map((flag) => (
                <div
                  key={Math.random()}
                  className={`rounded-lg border p-3 ${flag.severity === 'high'
                    ? 'border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-950/40'
                    : ''
                    }${flag.severity === 'medium'
                      ? 'border-orange-300 bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40'
                      : ''
                    }${flag.severity === 'low'
                      ? 'border-yellow-300 bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950/40'
                      : ''
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${(() => {
                            if (flag.severity === 'high') {
                              return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200';
                            }
                            if (flag.severity === 'medium') {
                              return 'bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                            }
                            return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                          })()}`}
                        >
                          {flag.severity}
                        </span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {flag.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
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
