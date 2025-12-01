/**
 * Overview Tab Component for Candidate Details Dialog
 * Displays candidate information, skills, custom fields, resume, attachments, and AI scores
 */

import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { candidateDetailsFields } from "../../Candidate/candidate-details-fields";
import ResumeEvaluationDetails from "../../Candidate/ResumeEvaluationDetails";
import { followUpSepretorPatternRegex, scoreColors } from "@/lib/constants";
import { QuickTooltip } from "@/components/ui/tooltip";
import { Trophy, Bell, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollowUpParsing } from "../../../hooks/useFollowUpParsing";
import { getJobId } from "../../../utils/candidateAccessors";

interface CandidateOverviewTabProps {
  candidate: Candidate;
  user: User | null;
  onEditFollowUp: () => void;
  onRemoveFollowUp: () => void;
  isReEvaluating: boolean;
  isEvaluatingFor: string | null;
  onReEvaluate: () => void;
}

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + "st";
  if (j === 2 && k !== 12) return num + "nd";
  if (j === 3 && k !== 13) return num + "rd";
  return num + "th";
};

/**
 * Score Card Component - Reusable for all score types
 */
interface ScoreCardProps {
  score: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  tooltipContent?: React.ReactNode;
}

function ScoreCard({ score, label, description, icon, tooltipContent }: ScoreCardProps) {
  const normalizedScore = Math.max(1, Math.min(10, score));
  const roundedScore = Math.round(normalizedScore);
  const scoreColor = scoreColors[roundedScore];

  const cardContent = (
    <div
      className={`${scoreColor.border} border-2 bg-transparent rounded-lg p-4 relative h-36 flex items-center justify-center`}
    >
      <div className="absolute top-3 right-3">{icon}</div>
      <div className="text-center">
        <div
          className={`text-2xl font-bold ${scoreColor.text}`}
          style={{ color: scoreColor.text }}
        >
          {score}/10
        </div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
          {label}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </div>
      </div>
    </div>
  );

  if (tooltipContent) {
    return (
      <QuickTooltip content={tooltipContent} side="top">
        {cardContent}
      </QuickTooltip>
    );
  }

  return cardContent;
}

/**
 * Follow-up Section Component
 */
interface FollowUpSectionProps {
  candidate: Candidate;
  user: User | null;
  onEdit: () => void;
  onRemove: () => void;
}

function FollowUpSection({ candidate, user, onEdit, onRemove }: FollowUpSectionProps) {
  const parsed = useFollowUpParsing(candidate);

  if (!candidate.followUp?.date && !candidate.followUp?.note) {
    return null;
  }

  if (user?.role === "interviewer") {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border-l-4 border-amber-400 dark:border-amber-500">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                Follow-up Reminder
              </h4>
              {candidate.followUp.date && (
                <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 px-2 py-1 rounded">
                  {new Date(candidate.followUp.date).toLocaleDateString()} at{" "}
                  {new Date(candidate.followUp.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            {candidate.followUp.note && (
              <>
                {parsed.userNotes.map((note, index) => (
                  <div key={`note-${index}`} className="relative">
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words">
                      {note}
                    </p>
                  </div>
                ))}
                {parsed.completionNote && (
                  <>
                    {parsed.userNotes.length > 0 && (
                      <hr className="my-2 border-t border-amber-300 dark:border-amber-600" />
                    )}
                    <div className="relative">
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words font-semibold">
                        {parsed.completionNote}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
            {candidate.followUp.userId && (
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Created by:{" "}
                <span className="font-bold">{candidate.followUp.userId.name}</span>
              </div>
            )}
          </div>
        </div>
        {(user?.role === "admin" || user?.role === "hr") && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/30"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit Follow-up"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove Follow-up"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AI Scores Section Component
 */
interface AIScoresSectionProps {
  candidate: Candidate;
}

function AIScoresSection({ candidate }: AIScoresSectionProps) {
  if (candidate.scores?.overall === undefined) {
    return null;
  }

  const hasRanking =
    candidate.scores?.comparativeRanking?.overallRank !== undefined;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        AI Assessment Scores
      </h3>
      <div
        className={`grid grid-cols-2 gap-4 ${
          hasRanking ? "md:grid-cols-5" : "md:grid-cols-4"
        }`}
      >
        {candidate.scores.overall !== undefined && (
          <ScoreCard
            score={candidate.scores.overall}
            label="Overall Fit"
            description="Combined assessment"
            icon={
              <svg
                className={`w-5 h-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.overall)))].text}`}
                style={{
                  color: scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.overall)))].text,
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        )}

        {candidate.scores.experience !== undefined && (
          <ScoreCard
            score={candidate.scores.experience}
            label="Experience"
            description="Relevant experience match"
            icon={
              <svg
                className={`w-5 h-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.experience)))].text}`}
                style={{
                  color: scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.experience)))].text,
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            }
          />
        )}

        {candidate.scores.skills !== undefined && (
          <ScoreCard
            score={candidate.scores.skills}
            label="Skills Match"
            description="Technical skills alignment"
            icon={
              <svg
                className={`w-5 h-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.skills)))].text}`}
                style={{
                  color: scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.skills)))].text,
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            }
          />
        )}

        {candidate.scores.affordability !== undefined && (
          <ScoreCard
            score={candidate.scores.affordability}
            label="Affordability"
            description="Cost-effectiveness match"
            icon={
              <svg
                className={`w-5 h-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.affordability)))].text}`}
                style={{
                  color: scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.affordability)))].text,
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        )}

        {candidate.scores?.comparativeRanking &&
          candidate.scores.comparativeRanking.overallRank !== undefined && (
            <QuickTooltip
              content={
                <div className="space-y-2 p-1">
                  <div className="font-semibold text-xs mb-2">Ranking Breakdown</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Skills:</span>
                      <span className="font-semibold">
                        {candidate.scores.comparativeRanking.skillsPercentile} percentile
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Experience:</span>
                      <span className="font-semibold">
                        {candidate.scores.comparativeRanking.experiencePercentile} percentile
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Affordability:</span>
                      <span className="font-semibold">
                        {candidate.scores.comparativeRanking.affordabilityPercentile} percentile
                      </span>
                    </div>
                  </div>
                </div>
              }
              side="top"
            >
              <div
                className={`${scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].border} border-2 bg-transparent rounded-lg p-4 relative cursor-help h-36 flex items-center justify-center`}
              >
                <div className="absolute top-3 right-3">
                  <Trophy
                    className={`w-5 h-5 ${scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].text}`}
                    style={{
                      color: scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].text,
                    }}
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].text}`}
                    style={{
                      color: scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].text,
                    }}
                  >
                    {getOrdinalSuffix(candidate.scores.comparativeRanking.overallRank)}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    Candidate Rank
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {candidate.scores.comparativeRanking.percentile} percentile •{" "}
                    {candidate.scores.comparativeRanking.totalCandidates} total
                  </div>
                </div>
              </div>
            </QuickTooltip>
          )}
      </div>
    </div>
  );
}

/**
 * Main Overview Tab Component
 */
export function CandidateOverviewTab({
  candidate,
  user,
  onEditFollowUp,
  onRemoveFollowUp,
  isReEvaluating,
  isEvaluatingFor,
  onReEvaluate,
}: CandidateOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Follow-up Section */}
      <FollowUpSection
        candidate={candidate}
        user={user}
        onEdit={onEditFollowUp}
        onRemove={onRemoveFollowUp}
      />

      {/* Skills */}
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Skills
          </h3>
          {candidateDetailsFields
            .find((field) => field.id === "skills")
            ?.render(candidate, user)}
        </div>
      )}

      {/* Custom Fields */}
      {candidate.customFields &&
        Object.keys(candidate.customFields).length > 0 && (
          <div className="space-y-4">
            {candidateDetailsFields
              .find((field) => field.id === "metafields")
              ?.render(candidate, user)}
          </div>
        )}

      {/* Resume Section */}
      {candidate.resume && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Resume
          </h3>
          {candidateDetailsFields
            .find((field) => field.id === "resume")
            ?.render(candidate, user)}
        </div>
      )}

      {/* Attachments Section */}
      {candidate.attachments && candidate.attachments.length > 0 && (
        <div className="space-y-4">
          {candidateDetailsFields
            .find((field) => field.id === "attachments")
            ?.render(candidate, user)}
        </div>
      )}

      {/* AI Assessment Scores Section */}
      <AIScoresSection candidate={candidate} />

      {/* Detailed AI Evaluation */}
      <div className="space-y-4">
        <ResumeEvaluationDetails
          labelClass="font-semibold text-base"
          localCandidate={candidate}
          isReEvaluating={isReEvaluating}
          isEvaluatingFor={isEvaluatingFor}
          onReEvaluate={onReEvaluate}
        />
      </div>
    </div>
  );
}

