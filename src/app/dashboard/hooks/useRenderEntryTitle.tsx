'use client';

import { useCallback } from 'react';
import type { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { isCvBatchUploadHistoryTitle } from '@/lib/cv-upload/history-titles';

export function useRenderEntryTitle(
  interview: ICandidateHistory,
  localCandidate: Candidate,
) {
  const renderEntryTitle = useCallback(() => {
    // Helper to safely extract name from object fields
    const getName = (obj: unknown): string | null => {
      if (typeof obj === 'object' && obj !== null && 'name' in obj) {
        const value = (obj as { name: unknown }).name;
        if (typeof value === 'string') {
          return value;
        }
      }
      return null;
    };

    const noteDescription =
      typeof interview?.note?.description === 'string'
        ? interview.note.description
        : '';

    const showMainBlock =
      (interview.title !== '' || !interview.title) &&
      interview.title !== 'Assigned to Job' &&
      !interview.title?.includes('Followup') &&
      !interview.title?.startsWith('Direct Email') &&
      !interview.title?.startsWith('Email sent: ') &&
      !interview.checklistForm &&
      !noteDescription.startsWith('Email sent');

    const assignmentByName = getName(interview.assignmentBy);

    const UpdatedBySection = (
      <div className="flex flex-col items-end text-right">
        <p className="text-xs font-light text-gray-400">
          {interview?.assignmentBy && 'Updated by'}
        </p>
        <p className="text-sm font-light text-gray-500">
          {assignmentByName || ''}
        </p>
      </div>
    );

    const getMainBlockContent = () => {
      const currentInterviewerName = getName(interview.currentInterviewer);
      const previousInterviewerName = getName(interview.previousInterviewer);

      // 1. Check Assignments
      if (currentInterviewerName) {
        if (previousInterviewerName) {
          return (
            <p className="pl-1">
              {`${previousInterviewerName} → ${currentInterviewerName}`}
            </p>
          );
        }
        return (
          <p className="pl-1">{`Assigned to ${currentInterviewerName}`}</p>
        );
      }

      // 2. Check Remarks
      if (interview.remark && interview.remark.description) {
        return <p>{interview.title || 'Remark Added'}</p>;
      }

      // 3. Check Specific Titles
      if (interview.title === 'Candidate Added' && interview.assignmentBy) {
        return (
          <p>
            {localCandidate.name} was added by {assignmentByName || ''}
          </p>
        );
      }

      if (interview.title === 'Self Applied') {
        return <p>{localCandidate.name} applied from portal</p>;
      }

      if (interview.title?.includes('Updated')) {
        return <p>{interview.title}</p>;
      }

      if (interview.title === 'Archived') {
        return <p>{localCandidate.name} was Archived</p>;
      }

      if (interview.title === 'Unarchived') {
        return <p>{localCandidate.name} was Unarchived</p>;
      }

      if (isCvBatchUploadHistoryTitle(interview.title)) {
        return <p>{localCandidate.name} was added from CV Batch Upload</p>;
      }

      // 4. Check Unassignment (Only if current was null)
      if (previousInterviewerName) {
        return (
          <p className="pl-1">Unassigned from {previousInterviewerName}</p>
        );
      }

      return null;
    };

    if (showMainBlock) {
      return (
        <div className="flex w-full flex-row items-start justify-between">
          <div className="flex w-[85%] flex-row">{getMainBlockContent()}</div>
          {UpdatedBySection}
        </div>
      );
    }

    // Default fallback (title only + updated by)
    return (
      <div className="flex w-full flex-row items-start justify-between">
        <span>{interview.title}</span>
        {interview.assignmentBy && UpdatedBySection}
      </div>
    );
  }, [interview, localCandidate]);

  return { renderEntryTitle };
}
