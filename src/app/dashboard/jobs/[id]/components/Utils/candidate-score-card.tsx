import { scoreColors } from '@/lib/constants';
import React from 'react';
import { Candidate } from '@/types/candidate';

interface CandidateScoreCardProps {
  candidate: Candidate;
}

function CandidateScoreCard({ candidate }: CandidateScoreCardProps) {
  return (
    <div className="space-y-4">
      {candidate.scores?.overall !== undefined && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Assessment Scores
        </h3>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {candidate.scores?.overall !== undefined &&
          (() => {
            const normalizedScore = Math.max(
              1,
              Math.min(10, candidate.scores.overall),
            );
            const overallScore = Math.round(normalizedScore);
            const scoreColor = scoreColors[overallScore];

            return (
              <div
                style={{
                  backgroundColor: scoreColor.bg,
                  color: scoreColor.text,
                  borderColor: scoreColor.border,
                }}
                className={`${scoreColor.bg} ${scoreColor.border} relative rounded-lg border p-4`}
              >
                <div className="absolute right-3 top-3">
                  <svg
                    className={`h-5 w-5 ${scoreColor.text}`}
                    style={{ color: scoreColor.text }}
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
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${scoreColor.text}`}
                    style={{ color: scoreColor.text }}
                  >
                    {candidate.scores.overall}
                    /10
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Overall Fit
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Combined assessment
                  </div>
                </div>
              </div>
            );
          })()}

        {candidate.scores?.experience !== undefined &&
          (() => {
            const normalizedScore = Math.max(
              1,
              Math.min(10, candidate.scores.experience),
            );
            const experienceScore = Math.round(normalizedScore);
            const scoreColor = scoreColors[experienceScore];

            return (
              <div
                className={`${scoreColor.bg} ${scoreColor.border} relative rounded-lg border p-4`}
                style={{
                  backgroundColor: scoreColor.bg,
                  color: scoreColor.text,
                  borderColor: scoreColor.border,
                }}
              >
                <div className="absolute right-3 top-3">
                  <svg
                    className={`h-5 w-5 ${scoreColor.text}`}
                    style={{ color: scoreColor.text }}
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
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${scoreColor.text}`}
                    style={{ color: scoreColor.text }}
                  >
                    {candidate.scores.experience}
                    /10
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Experience
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Relevant experience match
                  </div>
                </div>
              </div>
            );
          })()}

        {candidate.scores?.skills !== undefined &&
          (() => {
            const normalizedScore = Math.max(
              1,
              Math.min(10, candidate.scores.skills),
            );
            const skillsScore = Math.round(normalizedScore);
            const scoreColor = scoreColors[skillsScore];

            return (
              <div
                className={`${scoreColor.bg} ${scoreColor.border} relative rounded-lg border p-4`}
                style={{
                  backgroundColor: scoreColor.bg,
                  color: scoreColor.text,
                  borderColor: scoreColor.border,
                }}
              >
                <div className="absolute right-3 top-3">
                  <svg
                    className={`h-5 w-5 ${scoreColor.text}`}
                    style={{ color: scoreColor.text }}
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
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${scoreColor.text}`}
                    style={{ color: scoreColor.text }}
                  >
                    {candidate.scores.skills}
                    /10
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Skills Match
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Technical skills alignment
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

export default CandidateScoreCard;
