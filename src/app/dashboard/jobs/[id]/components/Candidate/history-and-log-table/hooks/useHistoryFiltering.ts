import { useMemo } from 'react';
import { ICandidateHistory } from '@/lib/models/history';
import { ILocalUser } from '@/lib/redux/authSlice';

/**
 * Filters and sorts timeline items based on role visibility and other criteria
 * @param timeLineItems - Array of candidate history items
 * @param user - Current user object
 * @returns Filtered and sorted timeline items
 */
export function useHistoryFiltering(
  timeLineItems: ICandidateHistory[],
  user: ILocalUser | null,
) {
  const filteredAndSortedItems = useMemo(
    () =>
      timeLineItems
        ?.sort(
          (a, b) =>
            new Date(b?.dateTime ?? 0).getTime() -
            new Date(a?.dateTime ?? 0).getTime(),
        )
        ?.filter((interview) => {
          // Check visibility based on visibleInHistory and user role
          const role = user?.role;

          // If this is a checklist form entry, enforce visibleInHistory
          if (interview?.checklistForm?.responses) {
            const hasVisibleResponses = Object.values(
              interview.checklistForm.responses,
            ).some(
              (resp) =>
                Array.isArray(resp?.visibleInHistory) &&
                resp.visibleInHistory.includes(role as string),
            );

            if (!hasVisibleResponses) {
              return false; // hide if no responses allow this role
            }
          }

          // Combine existing private remark logic with visibleInHistory
          if (!interview.remark || !interview.remark.description) {
            return true;
          }
          return (
            !interview.remark.isPrivate ||
            user?.role === 'hr' ||
            user?.role === 'admin'
          );
        })
        .filter((interview) => {
          // Filter out duplicate interviewer assignments
          if (
            typeof interview.currentInterviewer === 'object' &&
            interview.currentInterviewer &&
            'email' in interview.currentInterviewer &&
            typeof interview.previousInterviewer === 'object' &&
            interview.previousInterviewer &&
            'email' in interview.previousInterviewer &&
            interview.currentInterviewer !== null &&
            interview.currentInterviewer?.email ===
              interview.previousInterviewer?.email &&
            (!interview.note || !interview.note.description)
          ) {
            return false;
          }
          return true;
        })
        .filter((interview) => {
          // Filter out followups for interviewers
          if (
            user?.role === 'interviewer' &&
            interview.title?.toLowerCase().includes('followup')
          ) {
            return false;
          }
          return true;
        }),
    [timeLineItems, user],
  );

  return filteredAndSortedItems;
}
