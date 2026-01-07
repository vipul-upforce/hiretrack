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
    Object.keys(interview.checklistForm.responses).length === 0;

  const shouldRender = !isLogTableEntry && !hasEmptyChecklist;

  return {
    shouldRender,
    isLogTableEntry,
  };
}









