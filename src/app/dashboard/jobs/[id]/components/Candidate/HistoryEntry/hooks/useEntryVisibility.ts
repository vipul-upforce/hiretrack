import { ICandidateHistory } from '@/lib/models/history';

interface UseEntryVisibilityReturn {
  shouldRender: boolean;
  isLogTableEntry: boolean;
}

/**
 * Hook to determine if a history entry should be rendered
 */
export function useEntryVisibility(
  interview: ICandidateHistory,
): UseEntryVisibilityReturn {
  const isLogTableEntry =
    !!interview.note &&
    !!interview.note.description &&
    typeof interview.note.description !== 'string';

  const hasEmptyChecklist =
    !!interview.checklistForm &&
    (interview.checklistForm.responses instanceof Map
      ? interview.checklistForm.responses.size === 0
      : Object.keys(interview.checklistForm.responses || {}).length === 0);

  const hasRemarkOrNote =
    !!interview.remark?.description ||
    (!!interview.note &&
      typeof interview.note.description === 'string' &&
      !!interview.note.description);

  // Show checklist entries with a title even when responses are empty (e.g. "Completed incoming checklist for X lane")
  const isChecklistEntryWithTitle =
    !!interview.checklistForm && !!interview.title;

  const shouldRender =
    !isLogTableEntry &&
    (!hasEmptyChecklist || hasRemarkOrNote || isChecklistEntryWithTitle);

  return {
    shouldRender,
    isLogTableEntry,
  };
}









