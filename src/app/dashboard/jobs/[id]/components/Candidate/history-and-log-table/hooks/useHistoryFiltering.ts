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
              // Keep entry if there's a remark visible to this role (so HR/interviewer see optional/public remark even when checklist is hidden)
              const hasVisibleRemark =
                !!interview.remark?.description &&
                (role === 'hr' ||
                  role === 'admin' ||
                  !interview.remark.isPrivate);
              if (hasVisibleRemark) return true;
              // Keep checklist entries even when responses are empty (e.g. "Completed incoming checklist for X lane")
              const r = interview.checklistForm?.responses;
              const isEmptyResponses =
                !r ||
                (r instanceof Map ? r.size === 0 : Object.keys(r).length === 0);
              if (isEmptyResponses) return true;
              return false;
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
          // BUT only if there's no meaningful title or assignmentBy (indicating a real reassignment event)
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
            // Don't filter out if there's a meaningful title (like "Assigned by X")
            // or if assignmentBy exists (indicating a real reassignment event)
            if (
              interview.title &&
              interview.title.includes('Assigned by') &&
              interview.assignmentBy
            ) {
              return true; // Keep entries with meaningful assignment context
            }
            return false; // Filter out true duplicates
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
