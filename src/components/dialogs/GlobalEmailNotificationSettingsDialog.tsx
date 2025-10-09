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
  useGlobalEmailNotificationSettings,
  useUpdateGlobalEmailNotificationSettings,
} from "@/hooks/useGlobalEmailNotificationSettings";

interface GlobalEmailNotificationSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalEmailNotificationSettingsDialog({
  isOpen,
  onOpenChange,
}: GlobalEmailNotificationSettingsDialogProps) {
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
    useGlobalEmailNotificationSettings();
  const { updateSettings, loading: updating } =
    useUpdateGlobalEmailNotificationSettings();

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = (type: EmailNotificationType, enabled: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [type]: enabled,
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      await refetch();
    } catch {
      // error handled by hook
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings);
    } else {
      setLocalSettings(
        Object.fromEntries(
          allNotificationTypes.map((t) => [t, true])
        ) as Record<EmailNotificationType, boolean>
      );
    }
  };

  const hasChanges = () => {
    if (!settings) return false;
    return allNotificationTypes.some(
      (key) => localSettings[key] !== (settings[key] ?? true)
    );
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Global Email Notification Settings
            </DialogTitle>
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
        <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Global Email Notification Settings
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8 text-red-600">
            <span>Error loading settings: {error}</span>
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
            Global Email Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure your default email notification preferences for all jobs.
            <span className="block mt-1 text-sm text-muted-foreground">
              You can override these settings for specific jobs.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4 max-h-[400px]">
            {allNotificationTypes.map((type) => (
              <EmailNotificationToggle
                key={type}
                type={type}
                enabled={localSettings[type]}
                source="global-user"
                onToggle={handleToggle}
                showSource={false}
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
