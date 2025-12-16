'use client';

import { useCallback } from 'react';
import type { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';

export function useRenderEntryTitle(
  interview: ICandidateHistory,
  localCandidate: Candidate,
) {
  const renderEntryTitle = useCallback(() => {
    // --- 1. Helper for Type Wrapping ---
    // const isValidObject = (val: unknown): val is { name: string } =>
    //   val && typeof val === 'object' && 'name' in val && typeof val.name === 'string';

    // --- 1. Helper for Type Wrapping ---
    const isValidObject = (val: unknown): val is { name: string } =>
      typeof val === 'object' && val !== null && 'name' in val;

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

    const UpdatedBySection = (
      <div className="flex flex-col items-end text-right">
        <p className="text-xs font-light text-gray-400">
          {interview?.assignmentBy && 'Updated by'}
        </p>
        <p className="text-sm font-light text-gray-500">
          {isValidObject(interview.assignmentBy)
            ? `${interview.assignmentBy.name}`
            : ''}
        </p>
      </div>
    );

    // --- 2. Main Logic Block (Fixed: Removed 'else' keywords) ---
    const getMainContent = () => {
      // CASE 1: Current Interviewer Exists
      if (isValidObject(interview.currentInterviewer)) {
        if (isValidObject(interview.previousInterviewer)) {
          return (
            <p className="pl-1">
              {`${interview.previousInterviewer.name} → ${interview.currentInterviewer.name}`}
            </p>
          );
        }
        return (
          <p className="pl-1">
            {`Assigned to ${interview.currentInterviewer.name}`}
          </p>
        );
      }

      // CASE 2: Remark exists
      if (interview.remark && interview.remark.description) {
        return <p>{interview.title || 'Remark Added'}</p>;
      }

      // CASE 3: Candidate Added
      if (interview.title === 'Candidate Added' && interview.assignmentBy) {
        const assignedByName = isValidObject(interview.assignmentBy)
          ? interview.assignmentBy.name
          : '';

        return (
          <p>
            {localCandidate.name} was added by {assignedByName}
          </p>
        );
      }

      // CASE 4: Self Applied
      if (interview.title === 'Self Applied') {
        return <p>{localCandidate.name} applied from portal</p>;
      }

      // CASE 5: Updated
      if (interview.title?.includes('Updated')) {
        return <p>{interview.title}</p>;
      }

      // CASE 6: Archived
      if (interview.title === 'Archived') {
        return <p>{localCandidate.name} was Archived</p>;
      }

      // CASE 7: Unarchived
      if (interview.title === 'Unarchived') {
        return <p>{localCandidate.name} was Unarchived</p>;
      }

      // CASE 8: CV Process Batch
      if (interview.title === 'cv-process batch') {
        return <p>{localCandidate.name} was added from CV Batch Upload</p>;
      }

      // CASE 9: Unassigned (Fallback for when Current is NOT valid, but Previous IS)
      if (isValidObject(interview.previousInterviewer)) {
        return (
          <p className="pl-1">
            Unassigned from {interview.previousInterviewer.name}
          </p>
        );
      }

      // CASE 10: Null / Nothing matched
      return null;
    };

    if (showMainBlock) {
      return (
        <div className="flex w-full flex-row items-start justify-between">
          <div className="flex w-[85%] flex-row">{getMainContent()}</div>
          {UpdatedBySection}
        </div>
      );
    }

    // Default fallback
    return (
      <div className="flex w-full flex-row items-start justify-between">
        <span>{interview.title}</span>
        {interview.assignmentBy && UpdatedBySection}
      </div>
    );
  }, [interview, localCandidate]);

  return { renderEntryTitle };
}
