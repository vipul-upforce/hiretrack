import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Edit, Trash2, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Candidate } from '@/types/candidate';

interface ZoomMeetSummaryCardProps {
  candidate: Candidate;
  onEdit: () => void;
  onCancelMeet: () => void;
}

/**
 * Summary card shown when a Zoom meeting is already scheduled and not in edit mode.
 */
export function ZoomMeetSummaryCard({
  candidate,
  onEdit,
  onCancelMeet,
}: ZoomMeetSummaryCardProps) {
  const zoom = candidate.assignment?.zoomMeet;
  if (!zoom) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-medium">Zoom Scheduled</span>
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
      <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 p-3 dark:border-gray-800 dark:bg-black">
        <div className="text-sm text-sky-900 dark:text-sky-500">
          <p className="font-medium">
            {zoom.summary || 'Zoom Interview'}
          </p>
          <p className="mt-1 text-xs text-sky-700 dark:text-sky-600">
            {zoom.description?.split('\n')[0]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={zoom.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-sky-600 underline hover:text-sky-700 dark:text-sky-200"
          >
            <ExternalLink className="h-3 w-3" />
            Join Meeting
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(zoom.meetingLink || '');
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
