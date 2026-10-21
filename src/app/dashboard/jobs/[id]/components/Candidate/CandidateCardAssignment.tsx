/**
 * Candidate Card Assignment Component
 * Displays interview assignment details with Google Meet integration
 */

import { Badge } from '@/components/ui/badge';
import {
  CalendarClockIcon,
  Video,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';
import { Candidate } from '@/types/candidate';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';
import { getInterviewerName } from '../../utils/candidateAccessors';

interface CandidateCardAssignmentProps {
  candidate: Candidate;
  isSyncing: boolean;
  onSync: (e: React.MouseEvent) => void;
  onAssignClick: (e: React.MouseEvent) => void;
  onCopy: (text: string, label: string) => void;
}

export function CandidateCardAssignment({
  candidate,
  isSyncing,
  onSync,
  onAssignClick,
  onCopy,
}: CandidateCardAssignmentProps) {
  const interviewerName = getInterviewerName(candidate);

  if (
    !candidate.assignment ||
    !candidate.assignment.interviewerId ||
    typeof candidate.assignment.interviewerId !== 'object' ||
    !candidate.assignment.interviewerId._id ||
    !interviewerName
  ) {
    return null;
  }

  const { googleMeet, zoomMeet, microsoftTeams } = candidate.assignment;
  const hasGoogleMeet = googleMeet?.eventId;
  const hasZoomMeet = zoomMeet?.meetingId;
  const hasMicrosoftTeams = microsoftTeams?.meetingId;
  const attendeeResponses = googleMeet?.attendeeResponses || [];

  const hasDeclined = attendeeResponses.some(
    (a) => a.responseStatus === 'declined',
  );
  const allAccepted = attendeeResponses.every(
    (a) => a.responseStatus === 'accepted',
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className="-mx-4 -mb-4 cursor-pointer rounded-b-lg border-t border-gray-200 bg-white px-4 py-1.5 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-black/70 dark:hover:bg-gray-800/70"
      onClick={onAssignClick}
    >
      <div className="flex min-h-[20px] items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <CalendarClockIcon
            size={12}
            className="flex-shrink-0 text-gray-400 dark:text-gray-500"
          />
          <span className="truncate text-xs text-gray-600 dark:text-gray-400">
            Assigned to <span className="font-semibold">{interviewerName}</span>
            {hasGoogleMeet && (
              <Badge
                variant="default"
                className="ml-2 border-blue-200 bg-blue-100 text-xs text-blue-800 hover:bg-blue-200"
              >
                <Video size={10} className="mr-1" />
                Google Meet
              </Badge>
            )}
            {hasZoomMeet && (
              <Badge
                variant="default"
                className="ml-2 border-sky-200 bg-sky-100 text-xs text-sky-800 hover:bg-sky-200"
              >
                <Video size={10} className="mr-1" />
                Zoom
              </Badge>
            )}
            {hasMicrosoftTeams && (
              <Badge
                variant="default"
                className="ml-2 border-purple-200 bg-purple-100 text-xs text-purple-800 hover:bg-purple-200"
              >
                <Video size={10} className="mr-1" />
                Teams
              </Badge>
            )}
          </span>
          {hasGoogleMeet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'relative flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors',
                      (() => {
                        if (hasDeclined) {
                          return 'bg-red-500 hover:bg-red-600';
                        }
                        if (allAccepted) {
                          return 'bg-green-500 hover:bg-green-600';
                        }
                        return 'bg-blue-500 hover:bg-blue-600';
                      })(),
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      const meetingInfo = `Meeting: ${googleMeet.summary}
Description: ${googleMeet.description}
Time: ${candidate.assignment?.time ? `${formatDate(candidate.assignment.time)} at ${formatTime(candidate.assignment.time)}` : 'Not set'}
Google Meet Link: ${googleMeet.meetingLink}`;
                      onCopy(meetingInfo, 'Meeting information');
                    }}
                  >
                    <Video size={12} className="text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-gray-600/50 dark:bg-black/95"
                >
                  <div className="space-y-2">
                    <div className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
                      {googleMeet.summary}
                    </div>
                    <div className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                      <div className="h-1 w-1 rounded-full bg-blue-500" />
                      Click to copy meeting details
                    </div>
                    <div className="text-xs">
                      <div className="mb-1 text-gray-500 dark:text-gray-400">
                        Meeting Link:
                      </div>
                      <div className="break-all rounded border border-blue-200/50 bg-blue-50/50 px-2 py-1 text-blue-600 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-400">
                        {googleMeet.meetingLink}
                      </div>
                    </div>
                    {attendeeResponses.length > 0 && (
                      <div className="text-xs">
                        <div className="mb-1 text-gray-500 dark:text-gray-400">
                          Attendee Responses:
                        </div>
                        <div className="space-y-1">
                          {attendeeResponses.map((attendee) => (
                            <div
                              key={attendee.email}
                              className="group relative flex items-center justify-between gap-2 rounded bg-gray-50/50 px-2 py-1 dark:bg-gray-800/50"
                            >
                              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                                {attendee.name || attendee.email.split('@')[0]}
                              </span>
                              <div className="flex items-center gap-1">
                                {attendee.comment && (
                                  <div className="relative">
                                    <span className="cursor-help text-xs text-blue-500">
                                      <MessageCircle size={12} />
                                    </span>
                                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-xs -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                      {attendee.comment}
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-900" />
                                    </div>
                                  </div>
                                )}
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 text-xs font-medium',
                                    attendee.responseStatus === 'accepted' &&
                                    'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
                                    attendee.responseStatus === 'declined' &&
                                    'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
                                    attendee.responseStatus === 'tentative' &&
                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
                                    attendee.responseStatus === 'needsAction' &&
                                    'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
                                  )}
                                >
                                  {attendee.responseStatus === 'accepted' &&
                                    '✓ Accepted'}
                                  {attendee.responseStatus === 'declined' &&
                                    '✗ Declined'}
                                  {attendee.responseStatus === 'tentative' &&
                                    '? Maybe'}
                                  {attendee.responseStatus === 'needsAction' &&
                                    '⏳ Pending'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {hasZoomMeet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className="relative flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-sky-500 transition-colors hover:bg-sky-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      const meetingInfo = `Meeting: ${zoomMeet?.summary || 'Zoom Interview'}
Description: ${zoomMeet?.description || ''}
Time: ${candidate.assignment?.time ? `${formatDate(candidate.assignment.time)} at ${formatTime(candidate.assignment.time)}` : 'Not set'}
Zoom Link: ${zoomMeet?.meetingLink || ''}`;
                      onCopy(meetingInfo, 'Zoom meeting information');
                    }}
                  >
                    <Video size={12} className="text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-gray-600/50 dark:bg-black/95"
                >
                  <div className="space-y-2">
                    <div className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
                      {zoomMeet?.summary || 'Zoom Interview'}
                    </div>
                    <div className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                      <div className="h-1 w-1 rounded-full bg-sky-500" />
                      Click to copy meeting details
                    </div>
                    <div className="text-xs">
                      <div className="mb-1 text-gray-500 dark:text-gray-400">
                        Meeting Link:
                      </div>
                      <div className="break-all rounded border border-sky-200/50 bg-sky-50/50 px-2 py-1 text-sky-600 dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-400">
                        {zoomMeet?.meetingLink}
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {hasMicrosoftTeams && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className="relative flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-purple-500 transition-colors hover:bg-purple-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      const meetingInfo = `Meeting: ${microsoftTeams?.summary || 'Microsoft Teams Interview'}
Description: ${microsoftTeams?.description || ''}
Time: ${candidate.assignment?.time ? `${formatDate(candidate.assignment.time)} at ${formatTime(candidate.assignment.time)}` : 'Not set'}
Teams Link: ${microsoftTeams?.meetingLink || ''}`;
                      onCopy(meetingInfo, 'Teams meeting information');
                    }}
                  >
                    <Video size={12} className="text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-gray-600/50 dark:bg-black/95"
                >
                  <div className="space-y-2">
                    <div className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
                      {microsoftTeams?.summary || 'Microsoft Teams Interview'}
                    </div>
                    <div className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                      <div className="h-1 w-1 rounded-full bg-purple-500" />
                      Click to copy meeting details
                    </div>
                    <div className="text-xs">
                      <div className="mb-1 text-gray-500 dark:text-gray-400">
                        Meeting Link:
                      </div>
                      <div className="break-all rounded border border-purple-200/50 bg-purple-50/50 px-2 py-1 text-purple-600 dark:border-purple-800/50 dark:bg-purple-900/20 dark:text-purple-400">
                        {microsoftTeams?.meetingLink}
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Sync Button */}
          {hasGoogleMeet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                      isSyncing
                        ? 'cursor-not-allowed bg-blue-200 dark:bg-blue-800'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                    )}
                    onClick={onSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw
                      size={12}
                      className={cn(
                        'text-gray-600 dark:text-gray-400',
                        isSyncing && 'animate-spin',
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    {isSyncing ? 'Syncing...' : 'Sync attendee responses'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {candidate.assignment?.time && (
          <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-500">
            {formatDate(candidate.assignment.time)} •{' '}
            {formatTime(candidate.assignment.time)}
          </div>
        )}
      </div>
    </div>
  );
}
