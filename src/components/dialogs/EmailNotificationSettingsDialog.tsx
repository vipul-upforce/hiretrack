"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Settings } from "lucide-react";
import {
  EmailNotificationToggle,
  EmailNotificationType,
} from "@/components/ui/email-notification-toggle";
import {
  useUserEmailNotificationSettings,
  useUpdateUserEmailNotificationSettings,
  UserEmailSettings,
} from "@/hooks/useEmailNotificationSettings";

interface EmailNotificationSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string;
  jobId?: string; // Optional for job-specific settings
}

export function EmailNotificationSettingsDialog({
  isOpen,
  onOpenChange,
  userId,
  userName,
  userRole,
  jobId,
}: EmailNotificationSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<UserEmailSettings>({
    global: {
      newApplications: true,
      interviewAssignments: true,
      statusUpdates: true,
      newRemarks: true,
      stepCompleted: true,
      mentions: true,
    },
    jobLevel: {},
  });

  const { settings, loading, error, refetch } =
    useUserEmailNotificationSettings(userId, jobId);
  const { updateSettings, loading: updating } =
    useUpdateUserEmailNotificationSettings();

  // Initialize local settings when data loads
  useEffect(() => {
    if (settings) {
      const newLocalSettings: UserEmailSettings = {
        global: {
          newApplications: settings.global.newApplications.enabled,
          interviewAssignments: settings.global.interviewAssignments.enabled,
          statusUpdates: settings.global.statusUpdates.enabled,
          newRemarks: settings.global.newRemarks.enabled,
          stepCompleted: settings.global.stepCompleted.enabled,
          mentions: settings.global.mentions.enabled,
        },
        jobLevel: {},
      };

      // If job-specific settings exist, populate them
      if (settings.jobLevel && jobId) {
        newLocalSettings.jobLevel[jobId] = {
          newApplications: settings.jobLevel.newApplications.enabled,
          interviewAssignments: settings.jobLevel.interviewAssignments.enabled,
          statusUpdates: settings.jobLevel.statusUpdates.enabled,
          newRemarks: settings.jobLevel.newRemarks.enabled,
          stepCompleted: settings.jobLevel.stepCompleted.enabled,
          mentions: settings.jobLevel.mentions.enabled,
        };
      }

      setLocalSettings(newLocalSettings);
    }
  }, [settings, jobId]);

  const handleToggle = (type: EmailNotificationType, enabled: boolean) => {
    setLocalSettings((prev) => {
      const newSettings = { ...prev };

      if (jobId) {
        // Update job-specific setting
        if (!newSettings.jobLevel[jobId]) {
          newSettings.jobLevel[jobId] = { ...newSettings.global };
        }
        newSettings.jobLevel[jobId][type] = enabled;
      } else {
        // Update global setting
        newSettings.global[type] = enabled;
      }

      return newSettings;
    });
  };

  const handleSave = async () => {
    try {
      const updates: {
        global?: Record<EmailNotificationType, boolean>;
        jobLevel?: Record<string, Record<EmailNotificationType, boolean>>;
      } = {};

      if (jobId) {
        // Save job-specific settings
        updates.jobLevel = {
          [jobId]: localSettings.jobLevel[jobId] || localSettings.global,
        };
      } else {
        // Save global settings
        updates.global = localSettings.global;
      }

      await updateSettings(userId, updates);
      await refetch();
    } catch {
      // Error handling is done by the hook
    }
  };

  const handleReset = () => {
    if (settings) {
      const newLocalSettings: UserEmailSettings = {
        global: {
          newApplications: settings.global.newApplications.enabled,
          interviewAssignments: settings.global.interviewAssignments.enabled,
          statusUpdates: settings.global.statusUpdates.enabled,
          newRemarks: settings.global.newRemarks.enabled,
          stepCompleted: settings.global.stepCompleted.enabled,
          mentions: settings.global.mentions.enabled,
        },
        jobLevel: {},
      };

      if (settings.jobLevel && jobId) {
        newLocalSettings.jobLevel[jobId] = {
          newApplications: settings.jobLevel.newApplications.enabled,
          interviewAssignments: settings.jobLevel.interviewAssignments.enabled,
          statusUpdates: settings.jobLevel.statusUpdates.enabled,
          newRemarks: settings.jobLevel.newRemarks.enabled,
          stepCompleted: settings.jobLevel.stepCompleted.enabled,
          mentions: settings.jobLevel.mentions.enabled,
        };
      }

      setLocalSettings(newLocalSettings);
    } else {
      // Reset to default values if no settings loaded
      setLocalSettings({
        global: {
          newApplications: true,
          interviewAssignments: true,
          statusUpdates: true,
          newRemarks: true,
          stepCompleted: true,
          mentions: true,
        },
        jobLevel: {},
      });
    }
  };

  const getCurrentSettings = () => {
    if (jobId && localSettings.jobLevel[jobId]) {
      return localSettings.jobLevel[jobId];
    }
    return localSettings.global;
  };

  const getEffectiveToggleState = (type: EmailNotificationType) => {
    const currentSettings = getCurrentSettings();

    // Always use the current local settings if they exist
    if (currentSettings[type] !== undefined) {
      return currentSettings[type];
    }

    // If no local settings, fall back to the original settings from API
    if (settings) {
      if (jobId && settings.jobLevel) {
        return settings.jobLevel[type]?.enabled ?? true;
      }
      return settings.global[type]?.enabled ?? true;
    }

    // Default to true if no settings at all
    return true;
  };

  const getCurrentSource = (type: EmailNotificationType) => {
    if (!settings) return "org-default";

    if (jobId && settings.jobLevel) {
      return settings.jobLevel[type]?.source || "org-default";
    }

    // When configuring for another user, show "global-user" instead of the actual source
    // to indicate these are the user's global settings being configured
    return "global-user";
  };

  const notificationTypes: EmailNotificationType[] = [
    "newApplications",
    "interviewAssignments",
    "statusUpdates",
    "newRemarks",
    "stepCompleted",
    "mentions",
  ];

  const hasChanges = () => {
    if (!settings) return false;

    const currentSettings = getCurrentSettings();

    if (jobId && settings.jobLevel) {
      return notificationTypes.some((type) => {
        const currentValue = currentSettings[type];
        const originalValue =
          settings.jobLevel[type]?.enabled ??
          settings.global[type]?.enabled ??
          true;
        return currentValue !== originalValue;
      });
    }

    return notificationTypes.some((type) => {
      const currentValue = currentSettings[type];
      const originalValue = settings.global[type]?.enabled ?? true;
      return currentValue !== originalValue;
    });
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Notification Settings</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading settings...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Notification Settings</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8 text-red-500">
            <span>Failed to load settings: {error}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure global email notification preferences for {userName} (
            {userRole})
            {jobId && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Job-specific settings will override these global settings
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4">
            {/* Settings Type Badge */}
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <Badge variant="outline">
                {jobId ? "Job-Specific Settings" : "Global Settings"}
              </Badge>
            </div>

            <Separator />

            {/* Notification Toggles */}
            <div className="space-y-0">
              {notificationTypes.map((type) => (
                <EmailNotificationToggle
                  key={type}
                  type={type}
                  enabled={getEffectiveToggleState(type)}
                  source={
                    getCurrentSource(type) as
                      | "job-level"
                      | "global-user"
                      | "admin-override"
                      | "org-default"
                  }
                  onToggle={handleToggle}
                  disabled={updating}
                  showSource={false} // Don't show source badges - header is clear enough
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center border-t bg-background px-6 py-4 sticky bottom-0 z-10 gap-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={updating || !hasChanges()}
            >
              Reset
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updating || !hasChanges()}>
                {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
