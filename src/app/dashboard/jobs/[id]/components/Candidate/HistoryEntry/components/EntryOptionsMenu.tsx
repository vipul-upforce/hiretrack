import useRoles from '@/hooks/useRoles';
import { useAppSelector } from '@/lib/redux/hooks';
import { RemarkOptionsMenu } from '../../../Remarks/remark-options-menu';
import { EntryOptionsMenuProps } from '../types';

/**
 * Component to display remark and note options menus
 */
export function EntryOptionsMenu({
  interview,
  isRemarkOptionsOpen,
  isRemarkOpsOpenFor,
  isNoteOpsOpenFor,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
}: EntryOptionsMenuProps) {
  const { user } = useAppSelector((state) => state.auth);
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
        />
      )}

      {/* Note options */}
      {showNoteOptions && interview._id && (
        <RemarkOptionsMenu
          type="note"
          remarkId={interview._id}
          isPrivate={interview.note?.isPrivate || false}
          onTogglePrivacy={async (id, isPrivate) => {
            await handleRemarkUpdate(
              id,
              interview.note?.description as string || '',
              isPrivate,
            );
          }}
          onEdit={() => {
            if (
              interview.note &&
              typeof interview.note.description === 'string'
            ) {
              setEditingRemark({
                id: interview._id,
                description: interview.note.description,
                isPrivate: interview.note?.isPrivate || false,
                rating: interview.note.rating,
              });
              setIsEditRemarkDialogOpen(true);
            }
          }}
          isOpen={interview._id === isNoteOpsOpenFor}
        />
      )}
    </div>
  );
}
