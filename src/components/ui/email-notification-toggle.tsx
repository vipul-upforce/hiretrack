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

export type EmailNotificationType =
  | "newApplications"
  | "interviewAssignments"
  | "statusUpdates"
  | "newRemarks"
  | "stepCompleted"
  | "mentions";

export interface EmailNotificationToggleProps {
  type: EmailNotificationType;
  enabled: boolean;
  source: "job-level" | "global-user" | "admin-override" | "org-default";
  onToggle: (type: EmailNotificationType, enabled: boolean) => void;
  disabled?: boolean;
  showSource?: boolean;
}

const notificationLabels: Record<
  EmailNotificationType,
  { label: string; description: string }
> = {
  newApplications: {
    label: "New Applications",
    description: "Get notified when new candidates apply to jobs",
  },
  interviewAssignments: {
    label: "Interview Assignments",
    description: "Get notified when assigned to conduct interviews",
  },
  statusUpdates: {
    label: "Status Updates",
    description: "Get notified when candidate status changes",
  },
  newRemarks: {
    label: "New Remarks",
    description: "Get notified when new remarks are added to candidates",
  },
  stepCompleted: {
    label: "Step Completed",
    description: "Get notified when interview steps are completed",
  },
  mentions: {
    label: "Mentions",
    description: "Get notified when mentioned in remarks or comments",
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
  "global-user": "User Setting",
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
