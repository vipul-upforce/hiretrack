import { EntryContentProps } from '../types';
import { EntryRating } from './EntryRating';

/**
 * Component to display entry content (description and rating)
 */
export function EntryContent({ interview }: EntryContentProps) {
  const noteDescription =
    interview.note && typeof interview.note.description === 'string'
      ? interview.note.description
      : null;

  const remarkDescription = interview.remark?.description || null;

  const noteRating =
    interview?.note &&
    Object.keys(interview.note).length > 0 &&
    interview?.note?.rating !== 0
      ? interview?.note?.rating
      : undefined;

  const remarkRating =
    interview.remark?.rating && interview.remark.rating !== 0
      ? interview.remark.rating
      : undefined;

  return (
    <div className="mb-4 flex w-[full] flex-row items-start justify-between text-wrap break-all text-base font-normal text-gray-500 dark:text-gray-400">
      <p
        className="max-w-[90%] whitespace-pre-wrap pb-0 text-sm"
        style={{ wordWrap: 'break-word' }}
      >
        {noteDescription}
        {remarkDescription}
      </p>

      <EntryRating rating={noteRating} />
      <EntryRating rating={remarkRating} />
    </div>
  );
}





