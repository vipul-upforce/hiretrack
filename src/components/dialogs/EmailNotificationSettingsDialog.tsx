"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Shield, Settings } from "lucide-react";

import {
  EmailNotificationToggle,
  EmailNotificationType,
} from "@/components/ui/email-notification-toggle";

import {
  useOrganizationEmailNotificationSettings,
  useUpdateOrganizationEmailNotificationSettings,
} from "@/hooks/useEmailNotificationSettings";

import EmailNotificationSettingsSkeleton from "./email-notification-settings-skeleton";
import { useToast } from "@/hooks/use-toast";

// All email types (enabled by default)
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
        "jobCreated",
        "jobUpdated",
        "userAdded",
        "bulkImportCompleted",
        "candidateRejected",
        "candidateMoved",
      ] satisfies EmailNotificationType[]
    ).map((type) => [type, true])
  ) as Record<EmailNotificationType, boolean>;

interface EmailNotificationSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function EmailNotificationSettingsDialog({
  isOpen,
  onOpenChange,
  userId,
  userName,
}: EmailNotificationSettingsDialogProps) {
  const { toast } = useToast();

  const { settings: organizationSettings, loading, error, refetch } =
    useOrganizationEmailNotificationSettings();

  const { updateSettings, loading: updating } =
    useUpdateOrganizationEmailNotificationSettings();

  const [adminOverrides, setAdminOverrides] = useState<
    Partial<Record<EmailNotificationType, boolean>>
  >({});
  const [initialAdminOverrides, setInitialAdminOverrides] = useState<
    Partial<Record<EmailNotificationType, boolean>>
  >({});

  const notificationTypes = Object.keys(
    createDefaultNotificationSettings()
  ) as EmailNotificationType[];

  // Load saved admin overrides for this user
  useEffect(() => {
    if (!isOpen) return;

    if (organizationSettings) {
      const saved =
        organizationSettings.users.find((u) => u._id === userId)
          ?.currentOverride || {};

      setAdminOverrides(saved);
      setInitialAdminOverrides(saved);
    }
  }, [organizationSettings, isOpen, userId]);

  const handleToggle = (type: EmailNotificationType, enabled: boolean) => {
    setAdminOverrides((prev) => ({
      ...prev,
      [type]: enabled,
    }));
  };

  const handleReset = () => {
    setAdminOverrides(initialAdminOverrides);
  };

  const hasChanges = () => {
    const keys = notificationTypes;
    return keys.some((type) => adminOverrides[type] !== initialAdminOverrides[type]);
  };

  // Calculate if all notifications are enabled
  const getAllToggleState = () => {
    if (notificationTypes.length === 0) return false;
    return notificationTypes.every((type) => adminOverrides[type] ?? true);
  };

  const handleAllToggle = (enabled: boolean) => {
    const newOverrides: Partial<Record<EmailNotificationType, boolean>> = {};
    notificationTypes.forEach((type) => {
      newOverrides[type] = enabled;
    });
    setAdminOverrides(newOverrides);
  };

  const allToggleEnabled = getAllToggleState();

  const handleSave = async () => {
    try {
      await updateSettings({
        adminOverrides: {
          [userId]: adminOverrides as Record<EmailNotificationType, boolean>,
        },
      });

      toast({
        title: "Success",
        description: "Admin override settings updated successfully.",
      });

      await refetch();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save admin overrides.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notification Settings
          </DialogTitle>

          {/* <DialogDescription> */}
            <div className="flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Admin Override Mode
              </span>
            </div>
            <span className="block mt-2 text-sm text-muted-foreground">
              Configure which notifications are enabled or disabled for{" "}
              {userName}. These settings cannot be changed by the user.
            </span>
          {/* </DialogDescription> */}
        </DialogHeader>

        {loading ? (
          <EmailNotificationSettingsSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            Failed to load settings: {error}
          </div>
        ) : (
          <>
            <div className="flex flex-col h-full">
              {/* Fixed section below header */}
              <div className="px-6 py-2 border-b bg-background">
                {/* Header Badge */}
                {/* All Toggle - Fixed below header */}
                <div className="flex items-center justify-between space-x-4 py-3 px-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="notification-all"
                      className="text-sm font-semibold leading-none"
                    >
                      All Notifications
                    </Label>
                  </div>
                  <Switch
                    id="notification-all"
                    checked={allToggleEnabled}
                    onCheckedChange={handleAllToggle}
                    disabled={updating}
                  />
                </div>
              </div>

              {/* Scrollable Notification Toggles */}
              <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300">
                <div className="space-y-0">
                  {notificationTypes.map((type) => (
                    <EmailNotificationToggle
                      key={type}
                      type={type}
                      enabled={adminOverrides[type] ?? true}
                      disabled={updating}
                      onToggle={handleToggle}
                      source="admin-override"
                      showSource={true}
                    />
                  ))}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-between items-center border-t bg-background px-6 py-2">
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
