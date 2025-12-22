'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';
import {
  EmailNotificationToggle,
  EmailNotificationType,
} from '@/components/ui/email-notification-toggle';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useGlobalEmailNotificationSettings,
  useUpdateGlobalEmailNotificationSettings,
} from '@/hooks/useGlobalEmailNotificationSettings';
import { useAppSelector } from '@/lib/redux/hooks';
import { useOrganizationEmailNotificationSettings } from '@/hooks/useEmailNotificationSettings';
import {
  ALL_NOTIFICATION_TYPES,
  createDefaultNotificationSettings,
  resolveNotificationSource,
  isAdminOverrideDisabled,
  safeGetNotificationValue,
  safeSetNotificationValue,
} from '@/lib/utils/notificationSettings';
import logger from '@/lib/logger';
import EmailNotificationSettingsSkeleton from './email-notification-settings-skeleton';

export function GlobalEmailNotificationSettingsDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [localSettings, setLocalSettings] = useState<
    Record<EmailNotificationType, boolean>
  >(() => createDefaultNotificationSettings());

  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { settings, effectiveSettingsWithSource, loading, error, refetch } =
    useGlobalEmailNotificationSettings();
  const { updateSettings, loading: updating } =
    useUpdateGlobalEmailNotificationSettings();
  const { settings: organizationSettings } =
    useOrganizationEmailNotificationSettings();
  // Fetch admin overrides to check if any notification type is disabled
  const [adminOverrides, setAdminOverrides] = useState<Record<string, boolean>>(
    {},
  );

  const fetchAdminOverrides = async () => {
    try {
      if (organizationSettings) {
        setAdminOverrides(
          organizationSettings.users.find(
            (user) => user._id === currentUser?.id,
          )?.currentOverride || {},
        );
      }
    } catch (err) {
      logger.error('Error fetching admin overrides:', err);
    }
  };

  useEffect(() => {
    if (currentUser?.id && isOpen) {
      fetchAdminOverrides();
    }
  }, [currentUser?.id, isOpen]);

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
    return ALL_NOTIFICATION_TYPES.some((key) => {
      const localValue = safeGetNotificationValue(localSettings, key);
      const settingsValue = safeGetNotificationValue(settings, key) ?? true;
      return localValue !== settingsValue;
    });
  };

  // Calculate if all notifications are enabled (excluding admin-disabled ones)
  const getAllToggleState = () => {
    const toggleableTypes = ALL_NOTIFICATION_TYPES.filter(
      (type) => !isAdminOverrideDisabled(type, adminOverrides),
    );
    if (toggleableTypes.length === 0) return false;
    return toggleableTypes.every(
      (type) => safeGetNotificationValue(localSettings, type) === true,
    );
  };

  const handleAllToggle = (enabled: boolean) => {
    const newSettings = { ...localSettings };
    ALL_NOTIFICATION_TYPES.forEach((type) => {
      // Only toggle types that aren't disabled by admin override
      if (!isAdminOverrideDisabled(type, adminOverrides)) {
        safeSetNotificationValue(newSettings, type, enabled);
      }
    });
    setLocalSettings(newSettings);
  };

  const allToggleEnabled = getAllToggleState();
  const hasAdminDisabled = ALL_NOTIFICATION_TYPES.some((type) =>
    isAdminOverrideDisabled(type, adminOverrides),
  );

  const renderContent = () => {
    if (loading) {
      return <EmailNotificationSettingsSkeleton />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8 text-red-600">
          <span>
            Error loading settings:
            {error}
          </span>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        {/* Fixed section below header */}
        <div className="border-b bg-background px-6 py-2">
          {/* All Toggle - Fixed below header */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
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
        </div>

        {/* Scrollable Notification Toggles */}
        <div className="scrollbar-thin scrollbar-thumb-gray-300 max-h-[60vh] flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-0">
            {ALL_NOTIFICATION_TYPES.map((type) => {
              const isDisabled =
                isAdminOverrideDisabled(type, adminOverrides) || updating;
              const source = resolveNotificationSource(
                type,
                adminOverrides,
                effectiveSettingsWithSource!,
                'global-user',
              );

              return (
                <EmailNotificationToggle
                  key={type}
                  type={type}
                  enabled={
                    safeGetNotificationValue(localSettings, type) ?? false
                  }
                  source={source}
                  onToggle={handleToggle}
                  showSource
                  disabled={isDisabled}
                />
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between gap-4 border-t bg-background px-6 py-2">
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
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Global Email Notification Settings
          </DialogTitle>
          <span className="mt-1 block text-sm text-muted-foreground">
            Configure your default email notification preferences for all jobs.
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            You can override these settings for specific jobs.
          </span>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
