import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Edit, Trash2, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Candidate } from '@/types/candidate';

interface GoogleMeetSummaryCardProps {
  candidate: Candidate;
  onEdit: () => void;
  onCancelMeet: () => void;
}

/**
 * Summary card shown when a Google Meet is already scheduled and not in edit mode.
 */
export function GoogleMeetSummaryCard({
  candidate,
  onEdit,
  onCancelMeet,
}: GoogleMeetSummaryCardProps) {
  const meet = candidate.assignment?.googleMeet;
  if (!meet) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Google Meet Scheduled</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7 text-xs"
          >
            <Edit className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelMeet}
            className="h-7 text-xs text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Cancel Meet
          </Button>
        </div>
      </div>
      <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-gray-800 dark:bg-black">
        <div className="text-sm text-blue-900 dark:text-blue-500">
          <p className="font-medium">{meet.summary}</p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-600">
            {meet.description?.split('\n')[0]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={meet.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-200"
          >
            <ExternalLink className="h-3 w-3" />
            Join Meeting
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(meet.meetingLink || '');
              toast({
                title: 'Copied!',
                description: 'Meeting link copied to clipboard',
                duration: 2000,
              });
            }}
            className="h-6 text-xs"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
