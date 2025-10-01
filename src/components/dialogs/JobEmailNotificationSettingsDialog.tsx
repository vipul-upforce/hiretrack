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
import { Loader2, Mail } from "lucide-react";
import {
  EmailNotificationToggle,
  EmailNotificationType,
} from "@/components/ui/email-notification-toggle";
import {
  useJobEmailNotificationSettings,
  useUpdateJobEmailNotificationSettings,
} from "@/hooks/useEmailNotificationSettings";

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
  const [localSettings, setLocalSettings] = useState<
    Record<EmailNotificationType, boolean>
  >({
    newApplications: true,
    interviewAssignments: true,
    statusUpdates: true,
    newRemarks: true,
    stepCompleted: true,
    mentions: true,
  });

  const { settings, loading, error, refetch } =
    useJobEmailNotificationSettings(jobId);
  const { updateSettings, loading: updating } =
    useUpdateJobEmailNotificationSettings();

  // Initialize local settings when data loads
  useEffect(() => {
    if (settings?.currentJobSettings) {
      setLocalSettings(settings.currentJobSettings);
    } else if (settings?.effectiveSettings) {
      // Use effective settings as fallback
      const effectiveSettings: Record<EmailNotificationType, boolean> = {
        newApplications: true,
        interviewAssignments: true,
        statusUpdates: true,
        newRemarks: true,
        stepCompleted: true,
        mentions: true,
      };
      Object.entries(settings.effectiveSettings).forEach(([key, value]) => {
        if (key in effectiveSettings) {
          effectiveSettings[key as EmailNotificationType] = value.enabled;
        }
      });
      setLocalSettings(effectiveSettings);
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
      await updateSettings(jobId, localSettings);
      await refetch();
    } catch {
      // Error handling is done by the hook
    }
  };

  const handleReset = () => {
    if (settings?.currentJobSettings) {
      setLocalSettings(settings.currentJobSettings);
    } else if (settings?.effectiveSettings) {
      // Reset to effective settings
      const effectiveSettings: Record<EmailNotificationType, boolean> = {
        newApplications: true,
        interviewAssignments: true,
        statusUpdates: true,
        newRemarks: true,
        stepCompleted: true,
        mentions: true,
      };
      Object.entries(settings.effectiveSettings).forEach(([key, value]) => {
        if (key in effectiveSettings) {
          effectiveSettings[key as EmailNotificationType] = value.enabled;
        }
      });
      setLocalSettings(effectiveSettings);
    } else {
      // Reset to default settings
      setLocalSettings({
        newApplications: true,
        interviewAssignments: true,
        statusUpdates: true,
        newRemarks: true,
        stepCompleted: true,
        mentions: true,
      });
    }
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

    const originalSettings = settings.currentJobSettings || {};
    const effectiveSettings = settings.effectiveSettings || {};

    // Compare with current job settings if they exist, otherwise compare with effective settings
    const compareSettings =
      Object.keys(originalSettings).length > 0
        ? originalSettings
        : effectiveSettings;

    return Object.keys(localSettings).some((key) => {
      const currentValue = localSettings[key as EmailNotificationType];
      const originalValue = compareSettings[key]?.enabled ?? true;
      return currentValue !== originalValue;
    });
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Job Email Notification Settings
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
              Job Email Notification Settings
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
            Job Email Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure email notification preferences for &ldquo;{jobTitle}
            &rdquo;
            <span className="block mt-1 text-sm text-muted-foreground">
              These settings will override your global settings for this
              specific job
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <EmailNotificationToggle
                  key={type}
                  type={type}
                  enabled={localSettings[type] || false}
                  source="job-level"
                  onToggle={handleToggle}
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
