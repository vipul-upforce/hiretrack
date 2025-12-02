/**
 * Candidate Card Assignment Component
 * Displays interview assignment details with Google Meet integration
 */

import { Badge } from "@/components/ui/badge";
import {
  CalendarClockIcon,
  Video,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import { cn } from "@/lib/utils";
import { getInterviewerName } from "../../utils/candidateAccessors";

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
    typeof candidate.assignment.interviewerId !== "object" ||
    !candidate.assignment.interviewerId._id ||
    !interviewerName
  ) {
    return null;
  }

  const googleMeet = candidate.assignment.googleMeet;
  const hasGoogleMeet = googleMeet?.eventId;
  const attendeeResponses = googleMeet?.attendeeResponses || [];

  const hasDeclined = attendeeResponses.some(
    (a) => a.responseStatus === "declined"
  );
  const allAccepted = attendeeResponses.every(
    (a) => a.responseStatus === "accepted"
  );

  return (
    <div
      className="border-t rounded-b-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-black/70 -mx-4 -mb-4 px-4 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
      onClick={onAssignClick}
    >
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <CalendarClockIcon
            size={12}
            className="text-gray-400 dark:text-gray-500 flex-shrink-0"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
            Assigned to <span className="font-semibold">{interviewerName}</span>
            {hasGoogleMeet && (
              <Badge
                variant="default"
                className="ml-2 text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
              >
                <Video size={10} className="mr-1" />
                Google Meet
              </Badge>
            )}
          </span>
          {hasGoogleMeet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 relative",
                      hasDeclined
                        ? "bg-red-500 hover:bg-red-600"
                        : allAccepted
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-blue-500 hover:bg-blue-600"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      const meetingInfo = `Meeting: ${googleMeet.summary}
Description: ${googleMeet.description}
Time: ${candidate.assignment?.time ? `${formatDate(candidate.assignment.time)} at ${formatTime(candidate.assignment.time)}` : "Not set"}
Google Meet Link: ${googleMeet.meetingLink}`;
                      onCopy(meetingInfo, "Meeting information");
                    }}
                  >
                    <Video size={12} className="text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm p-3 bg-white/95 dark:bg-black/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl rounded-lg"
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                      {googleMeet.summary}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-2 py-1 rounded">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      Click to copy meeting details
                    </div>
                    <div className="text-xs">
                      <div className="text-gray-500 dark:text-gray-400 mb-1">
                        Meeting Link:
                      </div>
                      <div className="text-blue-600 dark:text-blue-400 break-all bg-blue-50/50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200/50 dark:border-blue-800/50">
                        {googleMeet.meetingLink}
                      </div>
                    </div>
                    {attendeeResponses.length > 0 && (
                      <div className="text-xs">
                        <div className="text-gray-500 dark:text-gray-400 mb-1">
                          Attendee Responses:
                        </div>
                        <div className="space-y-1">
                          {attendeeResponses.map((attendee, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50/50 dark:bg-gray-800/50 rounded relative group"
                            >
                              <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                                {attendee.name || attendee.email.split("@")[0]}
                              </span>
                              <div className="flex items-center gap-1">
                                {attendee.comment && (
                                  <div className="relative">
                                    <span className="text-blue-500 text-xs cursor-help">
                                      <MessageCircle size={12} />
                                    </span>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
                                      {attendee.comment}
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                )}
                                <span
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded font-medium",
                                    attendee.responseStatus === "accepted" &&
                                      "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
                                    attendee.responseStatus === "declined" &&
                                      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
                                    attendee.responseStatus === "tentative" &&
                                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
                                    attendee.responseStatus === "needsAction" &&
                                      "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
                                  )}
                                >
                                  {attendee.responseStatus === "accepted" &&
                                    "✓ Accepted"}
                                  {attendee.responseStatus === "declined" &&
                                    "✗ Declined"}
                                  {attendee.responseStatus === "tentative" &&
                                    "? Maybe"}
                                  {attendee.responseStatus === "needsAction" &&
                                    "⏳ Pending"}
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

          {/* Sync Button */}
          {hasGoogleMeet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                      isSyncing
                        ? "bg-blue-200 dark:bg-blue-800 cursor-not-allowed"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                    )}
                    onClick={onSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw
                      size={12}
                      className={cn(
                        "text-gray-600 dark:text-gray-400",
                        isSyncing && "animate-spin"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    {isSyncing ? "Syncing..." : "Sync attendee responses"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {candidate.assignment?.time && (
          <div className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
            {formatDate(candidate.assignment.time)} •{" "}
            {formatTime(candidate.assignment.time)}
          </div>
        )}
      </div>
    </div>
  );
}

