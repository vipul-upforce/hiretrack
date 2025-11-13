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
import EmailNotificationSettingsSkeleton from "./email-notification-settings-skeleton";

// Generate default settings automatically for all notification types
const createDefaultNotificationSettings = (): Record<
  EmailNotificationType,
  boolean
> =>
  Object.fromEntries(
    (
      [
        "newApplications",
        "interviewAssignments",
        "statusUpdates",
        "newRemarks",
        "stepCompleted",
        "mentions",
        "detailsUpdated",
        "meetingScheduled",
        "meetingUpdated",
        "meetingCancelled",
        "meetingInviteAccepted",
        "meetingInviteDeclined",
        "meetingInviteTentative",
        "interviewCompleted",
        "followupAdded",
        "followupUpdated",
        "followupRemoved",
        "checklistCompleted",
        "jobCreated",
        "jobUpdated",
        "userAdded",
        "bulkImportCompleted",
      ] satisfies EmailNotificationType[]
    ).map((type) => [type, true])
  ) as Record<EmailNotificationType, boolean>;

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
    global: createDefaultNotificationSettings(),
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
        global: createDefaultNotificationSettings(),
        jobLevel: {},
      };

      // Apply global settings
      if (settings.global) {
        Object.entries(settings.global).forEach(([key, value]) => {
          newLocalSettings.global[key as EmailNotificationType] = value.enabled;
        });
      }

      // Apply job-level overrides if any
      if (jobId && settings.jobLevel?.[jobId]) {
        const jobSettings = createDefaultNotificationSettings();
        Object.entries(settings.jobLevel[jobId]).forEach(([key, value]) => {
          jobSettings[key as EmailNotificationType] = value.enabled;
        });
        newLocalSettings.jobLevel[jobId] = jobSettings;
      }

      setLocalSettings(newLocalSettings);
    }
  }, [settings, jobId]);

  const handleToggle = (type: EmailNotificationType, enabled: boolean) => {
    setLocalSettings((prev) => {
      const newSettings = { ...prev };
      if (jobId) {
        if (!newSettings.jobLevel[jobId]) {
          newSettings.jobLevel[jobId] = { ...newSettings.global };
        }
        newSettings.jobLevel[jobId][type] = enabled;
      } else {
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
        updates.jobLevel = {
          [jobId]: localSettings.jobLevel[jobId] || localSettings.global,
        };
      } else {
        updates.global = localSettings.global;
      }

      await updateSettings(userId, updates);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const handleReset = () => {
    const resetSettings: UserEmailSettings = {
      global: createDefaultNotificationSettings(),
      jobLevel: {},
    };

    if (settings) {
      // Reset global
      if (settings.global) {
        Object.entries(settings.global).forEach(([key, value]) => {
          resetSettings.global[key as EmailNotificationType] = value.enabled;
        });
      }

      // Reset job-leve
      if (jobId && settings.jobLevel?.[jobId]) {
        const jobSettings = createDefaultNotificationSettings();
        Object.entries(settings.jobLevel[jobId]).forEach(([key, value]) => {
          jobSettings[key as EmailNotificationType] = value.enabled;
        });
        resetSettings.jobLevel[jobId] = jobSettings;
      }

      setLocalSettings(resetSettings);
    }
  };

  const getCurrentSettings = () => {
    const jobSettings = jobId ? localSettings.jobLevel[jobId] : undefined;
    return (
      jobSettings || localSettings.global || createDefaultNotificationSettings()
    );
  };

  const notificationTypes = Object.keys(
    createDefaultNotificationSettings()
  ) as EmailNotificationType[];

  const hasChanges = () => {
    if (!settings) return false;
    const currentSettings = getCurrentSettings();

    return notificationTypes.some((type) => {
      const currentValue = currentSettings[type];
      let originalValue: boolean;

      if (jobId && settings.jobLevel?.[jobId]) {
        // Job-specific settings take precedence
        originalValue =
          settings.jobLevel[jobId][type]?.enabled ??
          settings.global?.[type]?.enabled ??
          true;
      } else {
        // Fallback to global settings
        originalValue = settings.global?.[type]?.enabled ?? true;
      }

      return currentValue !== originalValue;
    });
  };

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

        {loading ? (
          <EmailNotificationSettingsSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <span>Failed to load settings: {error}</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col h-full">
              <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4 max-h-[70vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <Badge variant="outline">
                    {jobId ? "Job-Specific Settings" : "Global Settings"}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-0">
                  {notificationTypes.map((type) => (
                    <EmailNotificationToggle
                      key={type}
                      type={type}
                      enabled={getCurrentSettings()[type]}
                      source="global-user"
                      onToggle={handleToggle}
                      disabled={updating}
                      showSource={true}
                    />
                  ))}
                </div>
              </div>

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
                  <Button
                    onClick={handleSave}
                    disabled={updating || !hasChanges()}
                  >
                    {updating && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
