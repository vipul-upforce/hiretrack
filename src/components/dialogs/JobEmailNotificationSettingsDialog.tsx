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
  useOrganizationEmailNotificationSettings,
  useUpdateJobEmailNotificationSettings,
} from "@/hooks/useEmailNotificationSettings";
import { useSelector } from "react-redux";
import EmailNotificationSettingsSkeleton from "./email-notification-settings-skeleton";
import {
  ALL_NOTIFICATION_TYPES,
  createDefaultNotificationSettings,
  isAdminOverrideDisabled,
  resolveNotificationSource,
} from "@/lib/utils/notificationSettings";

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
  >(createDefaultNotificationSettings);

  const { user: currentUser } = useSelector((state: any) => state.auth || {});
  const { settings, loading, error, refetch } =
    useJobEmailNotificationSettings(jobId);
  const { updateSettings, loading: updating } =
    useUpdateJobEmailNotificationSettings();

  const [adminOverrides, setAdminOverrides] = useState<Record<string, boolean>>(
    {}
  );
  const { settings: organizationSettings } =
    useOrganizationEmailNotificationSettings();
  useEffect(() => {
    if (currentUser?.id && isOpen) {
      fetchAdminOverrides();
    }
  }, [currentUser?.id, isOpen]);

  const fetchAdminOverrides = async () => {
    try {
      if (organizationSettings) {
        setAdminOverrides(
          organizationSettings.users.find((user) => user._id === currentUser.id)
            ?.currentOverride || {}
        );
        return;
      }
    } catch (err) {
      console.error("Error fetching admin overrides:", err);
    }
  };
  // ✅ NEW FIX — APPLY ADMIN OVERRIDE WHEN organizationSettings LOADS
  useEffect(() => {
    if (isOpen && organizationSettings && currentUser?.id) {
      fetchAdminOverrides();
    }
  }, [organizationSettings, isOpen, currentUser?.id]);
  useEffect(() => {
    if (settings?.currentJobSettings) {
      setLocalSettings(settings.currentJobSettings);
    } else if (settings?.effectiveSettings) {
      const effective = createDefaultNotificationSettings();
      Object.entries(settings.effectiveSettings).forEach(([key, value]) => {
        if (key in effective) {
          effective[key as EmailNotificationType] = value.enabled;
        }
      });
      setLocalSettings(effective);
    }
  }, [settings]);

  const handleToggle = (type: EmailNotificationType, enabled: boolean) => {
    // Check if disabled by admin override
    if (isAdminOverrideDisabled(type, adminOverrides)) {
      return; // Don't allow toggle if disabled by admin
    }

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
      const effective = createDefaultNotificationSettings();
      Object.entries(settings.effectiveSettings).forEach(([key, value]) => {
        if (key in effective) {
          effective[key as EmailNotificationType] = value.enabled;
        }
      });
      setLocalSettings(effective);
    } else {
      setLocalSettings(createDefaultNotificationSettings());
    }
  };

  const hasChanges = () => {
    if (!settings) return false;
    const original = settings.currentJobSettings || {};
    const effective = settings.effectiveSettings || {};
    const compareSource =
      Object.keys(original).length > 0 ? original : effective;

    return ALL_NOTIFICATION_TYPES.some((key) => {
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
              {ALL_NOTIFICATION_TYPES.map((type) => {
                const isDisabled =
                  isAdminOverrideDisabled(type, adminOverrides) || updating;
                const source = resolveNotificationSource(
                  type,
                  adminOverrides,
                  settings?.effectiveSettings,
                  "job-level"
                );

                return (
                  <EmailNotificationToggle
                    key={type}
                    type={type}
                    enabled={localSettings[type]}
                    source={source}
                    onToggle={handleToggle}
                    showSource={true}
                    disabled={isDisabled}
                  />
                );
              })}
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
