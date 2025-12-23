import useRoles from '@/hooks/useRoles';
import { RemarkOptionsMenu } from '../../../Remarks/remark-options-menu';
import { EntryOptionsMenuProps } from '../types';

/**
 * Component to display remark and note options menus
 */
export function EntryOptionsMenu({
  interview,
  user,
  isRemarkOptionsOpen,
  isRemarkOpsOpenFor,
  isNoteOpsOpenFor,
  setIsRemarkOptionsOpen,
  setIsRemarkOpsOpenFor,
  setIsNoteOpsOpenFor,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
}: EntryOptionsMenuProps) {
  const role = useRoles();

  const showRemarkOptions =
    !!interview.remark?.description &&
    interview.remark?.id === isRemarkOpsOpenFor &&
    !!interview.assignmentBy &&
    typeof interview.assignmentBy === 'object' &&
    '_id' in interview.assignmentBy &&
    (role !== 'interviewer' || interview.assignmentBy?._id === user?.id) &&
    (role !== 'hr' || interview.assignmentBy?._id === user?.id) &&
    user?.role !== 'candidate';

  const hasNoteContent = interview.title?.includes('Followup')
    ? !!interview.note
    : !!interview.note?.description;

  const showNoteOptions =
    !!hasNoteContent &&
    !!interview.assignmentBy &&
    typeof interview.assignmentBy === 'object' &&
    '_id' in interview.assignmentBy &&
    (role !== 'interviewer' || interview.assignmentBy?._id === user?.id) &&
    (role !== 'hr' || interview.assignmentBy?._id === user?.id) &&
    user?.role !== 'candidate';

  return (
    <div className="relative">
      {/* Remark options */}
      {showRemarkOptions && (
        <RemarkOptionsMenu
          type="remark"
          remarkId={interview.remark?.id || ''}
          isPrivate={interview.remark?.isPrivate || false}
          onTogglePrivacy={async (id, isPrivate) => {
            await handleRemarkUpdate(
              id,
              interview.remark?.description || '',
              isPrivate,
            );
          }}
          onEdit={() => {
            if (interview.remark) {
              setEditingRemark({
                id: interview.remark.id,
                description: interview.remark.description,
                isPrivate: interview.remark.isPrivate || false,
                rating: interview.remark.rating,
              });
              setIsEditRemarkDialogOpen(true);
            }
          }}
          isOpen={
            isRemarkOptionsOpen && interview.remark?.id === isRemarkOpsOpenFor
          }
          setIsOpen={(open) => {
            setIsRemarkOptionsOpen(open);
            setIsRemarkOpsOpenFor(open ? interview.remark?.id || '' : '');
          }}
        />
      )}

      {/* Note options */}
      {showNoteOptions && interview._id && (
        <RemarkOptionsMenu
          type="note"
          remarkId={interview._id}
          onEdit={() => {
            if (
              interview.note &&
              typeof interview.note.description === 'string'
            ) {
              setEditingRemark({
                id: interview._id,
                description: interview.note.description,
                isPrivate: interview.remark?.isPrivate || false,
                rating: interview.note.rating,
              });
              setIsEditRemarkDialogOpen(true);
            }
          }}
          isOpen={interview._id === isNoteOpsOpenFor}
          setIsOpen={(open) => {
            setIsRemarkOptionsOpen(open);
            const noteId = interview._id ?? null;
            setIsNoteOpsOpenFor(open ? noteId : null);
          }}
        />
      )}
    </div>
  );
}
