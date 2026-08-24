import React from 'react';
import { ICandidateHistory } from '@/lib/models/history';
import { Candidate } from '@/types/candidate';
import { formatDate, formatTime } from '../../../../hooks/dateTimeFormatting';
import { IEditRemark } from '../../../../schemas/EditRemarkDialog';
import { RenderHistoryEntry } from '../../HistoryEntry';

interface HistoryTimelineProps {
  timeLineItems: ICandidateHistory[];
  candidate: Candidate;
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
  ) => void;
  setEditingRemark: React.Dispatch<React.SetStateAction<IEditRemark | null>>;
  setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Timeline view component displaying candidate history entries
 */
export function HistoryTimeline({
  timeLineItems,
  candidate,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
}: HistoryTimelineProps) {
  return (
    <ol className="relative border-s border-gray-200 dark:border-gray-700">
      {timeLineItems.length > 0
        ? timeLineItems?.map((interview, i) => {
          const timeDate = formatDate(interview.dateTime);
          const timeTime = formatTime(interview.dateTime);
          return (
            <RenderHistoryEntry
              interview={interview}
              indexKey={i}
              localCandidate={candidate}
              timeDate={timeDate}
              timeTime={timeTime}
              handleRemarkUpdate={handleRemarkUpdate}
              setEditingRemark={setEditingRemark}
              setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
              key={interview.dateTime + interview._id + interview.title}
            />
          );
        })
        : 'No History'}
    </ol>
  );
}
