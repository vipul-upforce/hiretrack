import { useState, useEffect } from 'react';
import { Candidate } from '@/types/candidate';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { NotebookText, Star, Loader2 } from 'lucide-react';
import { useLazyFetchCandidateDetailsQuery } from '@/lib/features/candidate/candidateApi';
import { formatTime } from '../../hooks/dateTimeFormatting';

function RemarksPopover({
  candidate,
  onMoreClick,
}: {
  candidate: Candidate & { remarksCount?: number };
  onMoreClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localRemarks, setLocalRemarks] = useState<Candidate['remarks']>(
    candidate?.remarks || [],
  );
  const [fetchDetails, { data: detailsData, isFetching }] =
    useLazyFetchCandidateDetailsQuery();

  // Use remarksCount if remarks array is empty (optimized API response)
  const remarksCount =
    candidate?.remarks?.length && candidate?.remarks?.length !== 0
      ? candidate?.remarks?.length
      : candidate?.remarksCount || 0;

  // Fetch remarks when popover opens (if not already loaded)
  useEffect(() => {
    if (
      isOpen &&
      (!candidate.remarks || candidate.remarks.length === 0) &&
      remarksCount > 0 &&
      !detailsData
    ) {
      fetchDetails(candidate._id);
    }
  }, [isOpen, candidate._id, candidate.remarks, remarksCount, fetchDetails, detailsData]);

  // Update local remarks when details are fetched
  useEffect(() => {
    if (detailsData && detailsData._id === candidate._id) {
      setLocalRemarks(detailsData.remarks || []);
    }
  }, [detailsData, candidate._id]);

  // Use local remarks if available, otherwise use candidate remarks
  const displayRemarks =
    localRemarks && localRemarks.length > 0
      ? localRemarks
      : candidate.remarks || [];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Badge
          onClick={(e) => {
            e.stopPropagation();
          }}
          variant="secondary"
          className="mr-1 flex w-[60px] flex-row items-center justify-evenly"
        >
          {remarksCount}
          <NotebookText className="ml-1 h-4 w-4" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="max-h-[60vh] w-80 overflow-y-auto p-4">
        <div className="space-y-2">
          <h4 className="font-bold">Remarks</h4>
          {isFetching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading remarks...
              </span>
            </div>
          )}
          {!isFetching && displayRemarks && displayRemarks.length > 0 && (
            <div className="space-y-2">
              {[...displayRemarks]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .slice(0, 6)
                .map((remark) => (
                  <div key={remark.date} className="border-b pb-2">
                    <div
                      className="align-center w-full whitespace-pre-wrap text-sm capitalize"
                      style={{ wordWrap: 'break-word' }}
                    >
                      {remark.description}
                      {remark?.rating && (
                        <div className="flex">
                          {remark?.rating}
                          /5
                          <Star
                            size="15px"
                            className="mt-[1px] text-amber-500 dark:text-amber-400"
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(remark.date).toLocaleDateString()}
                      &nbsp; {formatTime(remark.date)}
                    </p>
                  </div>
                ))}
              {displayRemarks.length > 6 && (
                <p
                  className="cursor-pointer text-center text-xs text-muted-foreground"
                  onClick={() => onMoreClick()}
                >
                  +{displayRemarks.length - 6} more remarks
                </p>
              )}
            </div>
          )}
          {!isFetching && (!displayRemarks || displayRemarks.length === 0) && (
            <p className="text-sm text-muted-foreground">No remarks yet</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default RemarksPopover;
