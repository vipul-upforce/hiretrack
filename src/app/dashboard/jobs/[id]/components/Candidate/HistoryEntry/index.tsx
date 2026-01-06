import { useRenderEntryTitle } from '@/app/dashboard/hooks/useRenderEntryTitle';
import FollowupDisplay from '../../Remarks/followup-popover';
import AttachmentsPopover from '../../Remarks/attachments-popover';
import { HistoryEntryProps } from './types';
import { useEntryOptions } from './hooks/useEntryOptions';
import { useEntryVisibility } from './hooks/useEntryVisibility';
import { EntryMetadata } from './components/EntryMetadata';
import { EntryOptionsMenu } from './components/EntryOptionsMenu';
import { EntryContent } from './components/EntryContent';
import { ChecklistResponseViewer } from './components/ChecklistResponseViewer';

/**
 * Main component to render a history entry
 */
export function RenderHistoryEntry({
  interview,
  indexKey,
  localCandidate,
  timeDate,
  timeTime,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
}: HistoryEntryProps) {
  const entryOptions = useEntryOptions();
  const { shouldRender } = useEntryVisibility(interview);
  const { renderEntryTitle } = useRenderEntryTitle(interview, localCandidate);

  if (!shouldRender) {
    return null;
  }

  const isPrivate =
    !!interview.remark?.isPrivate && !!interview.remark?.description;

  return (
    <div key={indexKey} className="group mb-10 ms-4">
      <div className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700" />

      <div
        className="group flex flex-row items-center justify-between"
        onMouseEnter={() => {
          entryOptions.handleMouseEnter();
          entryOptions.setIsRemarkOpsOpenFor(interview.remark?.id || null);
        }}
        onMouseLeave={entryOptions.handleMouseLeave}
      >
        <EntryMetadata
          timeDate={timeDate}
          timeTime={timeTime}
          isPrivate={isPrivate}
        />

        <EntryOptionsMenu
          interview={interview}
          isRemarkOptionsOpen={entryOptions.isRemarkOptionsOpen}
          isRemarkOpsOpenFor={entryOptions.isRemarkOpsOpenFor}
          isNoteOpsOpenFor={entryOptions.isNoteOpsOpenFor}
          handleRemarkUpdate={handleRemarkUpdate}
          setEditingRemark={setEditingRemark}
          setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        />
      </div>

      <h3 className="flex flex-row items-center justify-start text-lg font-semibold capitalize text-gray-900 dark:text-white">
        {renderEntryTitle()}
      </h3>

      <EntryContent interview={interview} />

      {interview.title?.startsWith('Followup') &&
        interview.note &&
        interview.note.date && (
          <FollowupDisplay
            note={interview.note.description as string}
            date={new Date(interview.note.date)}
            showToolTip={false}
          />
        )}

      <AttachmentsPopover
        attachments={interview.attachments}
        onMoreClick={() => null}
      />

      <ChecklistResponseViewer checklistForm={interview.checklistForm} />
    </div>
  );
}

export default RenderHistoryEntry;



