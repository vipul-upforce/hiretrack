"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// ✅ Full notification type list (same as NotificationType enum)
export type EmailNotificationType =
  | "mentions"
  | "newApplications"
  | "statusUpdates"
  | "detailsUpdated"
  | "interviewAssignments"
  | "stepCompleted"
  | "newRemarks"
  | "meetingScheduled"
  | "meetingUpdated"
  | "meetingCancelled"
  | "meetingInviteAccepted"
  | "meetingInviteDeclined"
  | "meetingInviteTentative"
  | "followupAdded"
  | "followupUpdated"
  | "followupRemoved"
  | "jobCreated"
  | "jobUpdated"
  | "userAdded"
  | "bulkImportCompleted"
  | "candidateRejected"
  | "interviewCompleted"
  | "candidateMoved";

export interface EmailNotificationToggleProps {
  type: EmailNotificationType;
  enabled: boolean;
  source: "job-level" | "global-user" | "admin-override" | "org-default";
  onToggle: (type: EmailNotificationType, enabled: boolean) => void;
  disabled?: boolean;
  showSource?: boolean;
}

// ✅ Updated labels & descriptions for all notification types
const notificationLabels: Record<
  EmailNotificationType,
  { label: string; description: string }
> = {
  mentions: {
    label: "Mentions",
    description: "Get notified when mentioned in remarks or comments",
  },
  newApplications: {
    label: "New Applications",
    description: "Get notified when new candidates apply to jobs",
  },
  statusUpdates: {
    label: "Status Updates",
    description: "Get notified when a candidate’s status changes",
  },
  detailsUpdated: {
    label: "Candidate Details Updated",
    description: "Get notified when candidate profile details are updated",
  },
  interviewAssignments: {
    label: "Interview Assignments",
    description: "Get notified when assigned to conduct an interview",
  },
  stepCompleted: {
    label: "Step Completed",
    description: "Get notified when interview steps are completed",
  },
  newRemarks: {
    label: "New Remarks",
    description: "Get notified when new remarks are added to candidates",
  },
  meetingScheduled: {
    label: "Meeting Scheduled",
    description: "Get notified when meetings are scheduled",
  },
  meetingUpdated: {
    label: "Meeting Updated",
    description: "Get notified when meeting details are updated",
  },
  meetingCancelled: {
    label: "Meeting Cancelled",
    description: "Get notified when a meeting is cancelled",
  },
  meetingInviteAccepted: {
    label: "Meeting Invite Accepted",
    description: "Get notified when meeting invites are accepted",
  },
  meetingInviteDeclined: {
    label: "Meeting Invite Declined",
    description: "Get notified when meeting invites are declined",
  },
  meetingInviteTentative: {
    label: "Meeting Invite Tentative",
    description: "Get notified when meeting invites are marked as tentative",
  },
  followupAdded: {
    label: "Follow-Up Added",
    description: "Get notified when a follow-up task is created",
  },
  followupUpdated: {
    label: "Follow-Up Updated",
    description: "Get notified when a follow-up task is updated",
  },
  followupRemoved: {
    label: "Follow-Up Removed",
    description: "Get notified when a follow-up task is deleted",
  },
  jobCreated: {
    label: "Job Created",
    description: "Get notified when a new job is created",
  },
  jobUpdated: {
    label: "Job Updated",
    description: "Get notified when job details are updated",
  },
  userAdded: {
    label: "User Added",
    description: "Get notified when new users are added to your organization",
  },
  bulkImportCompleted: {
    label: "Bulk Import Completed",
    description: "Get notified when bulk import processes are completed",
  },
  candidateRejected: {
    label: "Candidate Rejected",
    description: "Get notified when candidates are rejected",
  },
  interviewCompleted: {
    label: "Interview Completed",
    description: "Get notified when interviews are completed",
  },
  candidateMoved: {
    label: "Candidate Moved",
    description: "Get notified when a candidate is moved from one job to another",
  },
};

const sourceColors: Record<string, string> = {
  "job-level": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "global-user":
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "admin-override":
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "org-default":
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const sourceLabels: Record<string, string> = {
  "job-level": "Job Setting",
  "global-user": "Global Setting",
  "admin-override": "Admin Override",
  "org-default": "Default",
};

export function EmailNotificationToggle({
  type,
  enabled,
  source,
  onToggle,
  disabled = false,
  showSource = true,
}: EmailNotificationToggleProps) {
  const config = notificationLabels[type];

  if (!config) return null; // Safety guard in case of missing type

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between space-x-4 py-3 px-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <Label
              htmlFor={`notification-${type}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {config.label}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{config.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {showSource && (
            <Badge
              variant="secondary"
              className={`text-xs ${sourceColors[source] || sourceColors["org-default"]}`}
            >
              {sourceLabels[source] || "Default"}
            </Badge>
          )}
        </div>
        <Switch
          id={`notification-${type}`}
          checked={enabled}
          onCheckedChange={(checked) => onToggle(type, checked)}
          disabled={disabled}
        />
      </div>
    </TooltipProvider>
  );
}
