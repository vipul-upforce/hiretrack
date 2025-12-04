"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import {
  EmailNotificationToggle,
  EmailNotificationType,
} from "@/components/ui/email-notification-toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useGlobalEmailNotificationSettings,
  useUpdateGlobalEmailNotificationSettings,
} from "@/hooks/useGlobalEmailNotificationSettings";
import { useSelector } from "react-redux";
import EmailNotificationSettingsSkeleton from "./email-notification-settings-skeleton";
import { useOrganizationEmailNotificationSettings } from "@/hooks/useEmailNotificationSettings";
import {
  ALL_NOTIFICATION_TYPES,
  createDefaultNotificationSettings,
  resolveNotificationSource,
  isAdminOverrideDisabled,
} from "@/lib/utils/notificationSettings";

export function GlobalEmailNotificationSettingsDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
 
  const [localSettings, setLocalSettings] = useState<
    Record<EmailNotificationType, boolean>
  >(
    () =>
      createDefaultNotificationSettings()
  );

  const { user: currentUser } = useSelector((state: any) => state.auth || {});
  const { settings, effectiveSettingsWithSource, loading, error, refetch } =
    useGlobalEmailNotificationSettings();
  const { updateSettings, loading: updating } =
    useUpdateGlobalEmailNotificationSettings();
  const { settings: organizationSettings  } =
  useOrganizationEmailNotificationSettings();
  // Fetch admin overrides to check if any notification type is disabled
  const [adminOverrides, setAdminOverrides] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    if (currentUser?.id && isOpen) {
      fetchAdminOverrides();
    }
  }, [currentUser?.id, isOpen]);
  
  const fetchAdminOverrides = async () => {
    try {
      if (organizationSettings) {
        setAdminOverrides(organizationSettings.users.find((user) => user._id === currentUser.id)?.currentOverride || {});
        return;
      }
    } catch (err) {
      console.error("Error fetching admin overrides:", err);
    }
  };
  
  useEffect(() => {
    if (settings) {
      // Merge with defaults to ensure all notification types are present
      const defaults = createDefaultNotificationSettings();
      setLocalSettings({ ...defaults, ...settings });
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
      await updateSettings(localSettings);
      await refetch();
    } catch {
      // handled by hook
    }
  };


  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings);
    } else {
      setLocalSettings(createDefaultNotificationSettings());
    }
  };

  const hasChanges = () => {
    if (!settings) return false;
    return ALL_NOTIFICATION_TYPES.some(
      (key) => localSettings[key] !== (settings[key] ?? true)
    );
  };

  // Calculate if all notifications are enabled (excluding admin-disabled ones)
  const getAllToggleState = () => {
    const toggleableTypes = ALL_NOTIFICATION_TYPES.filter(
      (type) => !isAdminOverrideDisabled(type, adminOverrides)
    );
    if (toggleableTypes.length === 0) return false;
    return toggleableTypes.every((type) => localSettings[type]);
  };

  const handleAllToggle = (enabled: boolean) => {
    const newSettings = { ...localSettings };
    ALL_NOTIFICATION_TYPES.forEach((type) => {
      // Only toggle types that aren't disabled by admin override
      if (!isAdminOverrideDisabled(type, adminOverrides)) {
        newSettings[type] = enabled;
      }
    });
    setLocalSettings(newSettings);
  };

  const allToggleEnabled = getAllToggleState();
  const hasAdminDisabled = ALL_NOTIFICATION_TYPES.some((type) =>
    isAdminOverrideDisabled(type, adminOverrides)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden flex flex-col sm:max-w-lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Global Email Notification Settings
          </DialogTitle>
            <span className="block mt-1 text-sm text-muted-foreground">
              Configure your default email notification preferences for all jobs.
            </span>
            <span className="block mt-1 text-sm text-muted-foreground">
              You can override these settings for specific jobs.
            </span>
        </DialogHeader>

        {loading ? (
          <EmailNotificationSettingsSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <span>Error loading settings: {error}</span>
          </div>
        ) : (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4 max-h-[400px]">
              {/* All Toggle */}
              <div className="flex items-center justify-between space-x-4 py-3 px-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg mb-2">
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="notification-all"
                    className="text-sm font-semibold leading-none"
                  >
                    All Notifications
                  </Label>
                  {hasAdminDisabled && (
                    <p className="text-xs text-muted-foreground">
                      Some notifications are disabled by admin
                    </p>
                  )}
                </div>
                <Switch
                  id="notification-all"
                  checked={allToggleEnabled}
                  onCheckedChange={handleAllToggle}
                  disabled={updating}
                />
              </div>
              {ALL_NOTIFICATION_TYPES.map((type) => {
                const isDisabled = isAdminOverrideDisabled(type, adminOverrides) || updating ;
                const source = resolveNotificationSource(type, adminOverrides, effectiveSettingsWithSource, "global-user");
                
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
