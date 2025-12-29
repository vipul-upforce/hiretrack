import { Star } from 'lucide-react';
import { EntryRatingProps } from '../types';

/**
 * Component to display entry rating with star icon
 */
export function EntryRating({ rating }: EntryRatingProps) {
  if (!rating || rating === 0) return null;

  return (
    <div className="flex flex-row items-center">
      {rating}
      /5
      <Star size="15px" className="mt-[1px]" style={{ color: 'orange' }} />
    </div>
  );
}





