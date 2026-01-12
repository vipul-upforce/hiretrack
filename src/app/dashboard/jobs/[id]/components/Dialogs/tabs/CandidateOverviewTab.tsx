/**
 * Overview Tab Component for Candidate Details Dialog
 * Displays candidate information, skills, custom fields, resume, attachments, and AI scores
 */

import React, { useState } from 'react';
import { Candidate } from '@/types/candidate';
import { scoreColors } from '@/lib/constants';
import { QuickTooltip } from '@/components/ui/tooltip';
import { Trophy } from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
import ResumeEvaluationDetails from '../../Candidate/ResumeEvaluationDetails';
import { candidateDetailsFields } from '../../Candidate/candidate-details-fields';
import { CandidateCardFollowUp } from '../../Candidate/CandidateCardFollowUp';
import ConfirmationDialog from '../ConfirmationDialog';

interface CandidateOverviewTabProps {
  candidate: Candidate;
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
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
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

function ScoreCard({
  score,
  label,
  description,
  icon,
  tooltipContent,
}: ScoreCardProps) {
  const normalizedScore = Math.max(1, Math.min(10, score));
  const roundedScore = Math.round(normalizedScore);
  const scoreColor = scoreColors[roundedScore];

  const cardContent = (
    <div
      className={`${scoreColor.border} relative flex h-36 items-center justify-center rounded-lg border-2 bg-transparent p-4`}
    >
      <div className="absolute right-3 top-3">{icon}</div>
      <div className="text-center">
        <div
          className={`text-2xl font-bold ${scoreColor.text}`}
          style={{ color: scoreColor.text }}
        >
          {score}
          /10
        </div>
        <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
          hasRanking ? 'md:grid-cols-5' : 'md:grid-cols-4'
        }`}
      >
        {candidate.scores.overall !== undefined && (
          <ScoreCard
            score={candidate.scores.overall}
            label="Overall Fit"
            description="Combined assessment"
            icon={
              <svg
                className={`h-5 w-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.overall)))].text}`}
                style={{
                  color:
                    scoreColors[
                      Math.round(
                        Math.max(1, Math.min(10, candidate.scores.overall)),
                      )
                    ].text,
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
                className={`h-5 w-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.experience)))].text}`}
                style={{
                  color:
                    scoreColors[
                      Math.round(
                        Math.max(1, Math.min(10, candidate.scores.experience)),
                      )
                    ].text,
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
                className={`h-5 w-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.skills)))].text}`}
                style={{
                  color:
                    scoreColors[
                      Math.round(
                        Math.max(1, Math.min(10, candidate.scores.skills)),
                      )
                    ].text,
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
                className={`h-5 w-5 ${scoreColors[Math.round(Math.max(1, Math.min(10, candidate.scores.affordability)))].text}`}
                style={{
                  color:
                    scoreColors[
                      Math.round(
                        Math.max(
                          1,
                          Math.min(10, candidate.scores.affordability),
                        ),
                      )
                    ].text,
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
                  <div className="mb-2 text-xs font-semibold">
                    Ranking Breakdown
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Skills:</span>
                      <span className="font-semibold">
                        {candidate.scores.comparativeRanking.skillsPercentile}{' '}
                        percentile
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Experience:</span>
                      <span className="font-semibold">
                        {
                          candidate.scores.comparativeRanking
                            .experiencePercentile
                        }{' '}
                        percentile
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Affordability:</span>
                      <span className="font-semibold">
                        {
                          candidate.scores.comparativeRanking
                            .affordabilityPercentile
                        }{' '}
                        percentile
                      </span>
                    </div>
                  </div>
                </div>
              }
              side="top"
            >
              <div
                className={`${scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].border} relative flex h-36 cursor-help items-center justify-center rounded-lg border-2 bg-transparent p-4`}
              >
                <div className="absolute right-3 top-3">
                  <Trophy
                    className={`h-5 w-5 ${scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].text}`}
                    style={{
                      color:
                        scoreColors[
                          Math.max(
                            1,
                            Math.min(
                              10,
                              Math.round(
                                candidate.scores.comparativeRanking.percentile /
                                  10,
                              ),
                            ),
                          )
                        ].text,
                    }}
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${scoreColors[Math.max(1, Math.min(10, Math.round(candidate.scores.comparativeRanking.percentile / 10)))].text}`}
                    style={{
                      color:
                        scoreColors[
                          Math.max(
                            1,
                            Math.min(
                              10,
                              Math.round(
                                candidate.scores.comparativeRanking.percentile /
                                  10,
                              ),
                            ),
                          )
                        ].text,
                    }}
                  >
                    {getOrdinalSuffix(
                      candidate.scores.comparativeRanking.overallRank,
                    )}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Candidate Rank
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {candidate.scores.comparativeRanking.percentile} percentile
                    • {candidate.scores.comparativeRanking.totalCandidates}{' '}
                    total
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
  onEditFollowUp,
  onRemoveFollowUp,
  isReEvaluating,
  isEvaluatingFor,
  onReEvaluate,
}: CandidateOverviewTabProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [confirmRemoveFollowUpOpen, setConfirmRemoveFollowUpOpen] =
    useState(false);

  const handleRemoveClick = () => {
    setConfirmRemoveFollowUpOpen(true);
  };

  const handleConfirmRemove = () => {
    setConfirmRemoveFollowUpOpen(false);
    onRemoveFollowUp();
  };

  const handleCancelRemove = () => {
    setConfirmRemoveFollowUpOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Follow-up Section */}
      <CandidateCardFollowUp
        candidate={candidate}
        onEdit={onEditFollowUp}
        onRemove={handleRemoveClick}
        variant="detailed"
      />

      {/* Remove Follow-up Confirmation Dialog */}
      <ConfirmationDialog
        title="Remove Follow-up?"
        message="Are you sure you want to remove this follow-up reminder? This action cannot be undone."
        isOpen={confirmRemoveFollowUpOpen}
        setIsOpen={setConfirmRemoveFollowUpOpen}
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
        buttonName="Remove"
        className="sm:max-w-[400px]"
      />
      {/* Skills */}
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Skills
          </h3>
          {candidateDetailsFields
            .find((field) => field.id === 'skills')
            ?.render(candidate, { id: 'skills' })}
        </div>
      )}

      {/* Custom Fields */}
      {candidate.customFields &&
        Object.keys(candidate.customFields).length > 0 && (
          <div className="space-y-4">
            {candidateDetailsFields
              .find((field) => field.id === 'metafields')
              ?.render(candidate, { id: 'metafields' })}
          </div>
        )}

      {/* Resume Section */}
      {candidate.resume && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Resume
          </h3>
          {candidateDetailsFields
            .find((field) => field.id === 'resume')
            ?.render(candidate, { id: 'resume' })}
        </div>
      )}

      {/* Attachments Section */}
      {candidate.attachments && candidate.attachments.length > 0 && (
        <div className="space-y-4">
          {candidateDetailsFields
            .find((field) => field.id === 'attachments')
            ?.render(candidate, { id: 'attachments' })}
        </div>
      )}

      {/* AI Assessment Scores Section */}

      {/* Detailed AI Evaluation */}
      {user?.role !== 'candidate' && (
        <>
          <AIScoresSection candidate={candidate} />
          <div className="space-y-4">
            <ResumeEvaluationDetails
              labelClass="font-semibold text-base"
              localCandidate={candidate}
              isReEvaluating={isReEvaluating}
              isEvaluatingFor={isEvaluatingFor || ''}
              onReEvaluate={onReEvaluate}
            />
          </div>
        </>
      )}
    </div>
  );
}
