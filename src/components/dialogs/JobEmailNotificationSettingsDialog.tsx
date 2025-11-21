"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import {
  EmailNotificationToggle,
  EmailNotificationType,
} from "@/components/ui/email-notification-toggle";
import {
  useJobEmailNotificationSettings,
  useUpdateJobEmailNotificationSettings,
} from "@/hooks/useEmailNotificationSettings";
import EmailNotificationSettingsSkeleton from "./email-notification-settings-skeleton";

interface JobEmailNotificationSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

export function JobEmailNotificationSettingsDialog({
  isOpen,
  onOpenChange,
  jobId,
  jobTitle,
}: JobEmailNotificationSettingsDialogProps) {
  const allNotificationTypes: EmailNotificationType[] = useMemo(
    () => [
      "mentions",
      "newRemarks",
      "newApplications",
      "statusUpdates",
      "detailsUpdated",
      "interviewAssignments",
      "stepCompleted",
      "meetingScheduled",
      "meetingUpdated",
      "meetingCancelled",
      "meetingInviteAccepted",
      "meetingInviteDeclined",
      "meetingInviteTentative",
      "followupAdded",
      "followupUpdated",
      "followupRemoved",
      "checklistCompleted",
      "jobCreated",
      "jobUpdated",
      "candidateRejected",
      "interviewCompleted",
    ],
    []
  );

  const [localSettings, setLocalSettings] = useState<
    Record<EmailNotificationType, boolean>
  >(
    () =>
      Object.fromEntries(
        allNotificationTypes.map((type) => [type, true])
      ) as Record<EmailNotificationType, boolean>
  );

  const { settings, loading, error, refetch } =
    useJobEmailNotificationSettings(jobId);
  const { updateSettings, loading: updating } =
    useUpdateJobEmailNotificationSettings();

  useEffect(() => {
    if (settings?.currentJobSettings) {
      setLocalSettings(settings.currentJobSettings);
    } else if (settings?.effectiveSettings) {
      const effective = {
        ...Object.fromEntries(allNotificationTypes.map((t) => [t, true])),
      } as Record<EmailNotificationType, boolean>;

      Object.entries(settings.effectiveSettings).forEach(([key, value]) => {
        if (key in effective) {
          effective[key as EmailNotificationType] = value.enabled;
        }
      });
      setLocalSettings(effective);
    }
  }, [settings, allNotificationTypes]);

  const handleToggle = (type: EmailNotificationType, enabled: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [type]: enabled,
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(jobId, localSettings);
      await refetch();
    } catch {
      // error handled by hook
    }
  };

  const handleReset = () => {
    if (settings?.currentJobSettings) {
      setLocalSettings(settings.currentJobSettings);
    } else if (settings?.effectiveSettings) {
      const effective = {
        ...Object.fromEntries(allNotificationTypes.map((t) => [t, true])),
      } as Record<EmailNotificationType, boolean>;

      Object.entries(settings.effectiveSettings).forEach(([key, value]) => {
        if (key in effective) {
          effective[key as EmailNotificationType] = value.enabled;
        }
      });
      setLocalSettings(effective);
    } else {
      // Default to all enabled
      setLocalSettings(
        Object.fromEntries(
          allNotificationTypes.map((t) => [t, true])
        ) as Record<EmailNotificationType, boolean>
      );
    }
  };

  const hasChanges = () => {
    if (!settings) return false;
    const original = settings.currentJobSettings || {};
    const effective = settings.effectiveSettings || {};
    const compareSource =
      Object.keys(original).length > 0 ? original : effective;

    return allNotificationTypes.some((key) => {
      const currentValue = localSettings[key];
      const originalValue = compareSource[key]?.enabled ?? true;
      return currentValue !== originalValue;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Job Email Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure email notification preferences for &ldquo;{jobTitle}
            &rdquo;
            <span className="block mt-1 text-sm text-muted-foreground">
              These settings will override your global preferences for this job
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <EmailNotificationSettingsSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <span>Error loading settings: {error}</span>
          </div>
        ) : (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4 max-h-[70vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {allNotificationTypes.map((type) => (
                <EmailNotificationToggle
                  key={type}
                  type={type}
                  enabled={localSettings[type]}
                  source="job-level"
                  onToggle={handleToggle}
                  showSource={true}
                  disabled={updating}
                />
              ))}
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
                  variant="primary"
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
