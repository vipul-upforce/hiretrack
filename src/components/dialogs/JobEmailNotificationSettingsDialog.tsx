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
  useJobEmailNotificationSettings,
  useOrganizationEmailNotificationSettings,
  useUpdateJobEmailNotificationSettings,
} from '@/hooks/useEmailNotificationSettings';
import { useSelector } from 'react-redux';
import {
  ALL_NOTIFICATION_TYPES,
  createDefaultNotificationSettings,
  isAdminOverrideDisabled,
  resolveNotificationSource,
} from '@/lib/utils/notificationSettings';
import logger from '@/lib/logger';
import EmailNotificationSettingsSkeleton from './email-notification-settings-skeleton';

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
    {},
  );
  const { settings: organizationSettings } =
    useOrganizationEmailNotificationSettings();
  const fetchAdminOverrides = async () => {
    try {
      if (organizationSettings) {
        setAdminOverrides(
          organizationSettings.users.find((user) => user._id === currentUser.id)
            ?.currentOverride || {},
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

  // ✅ NEW FIX — APPLY ADMIN OVERRIDE WHEN organizationSettings LOADS
  useEffect(() => {
    if (isOpen && organizationSettings && currentUser?.id) {
      fetchAdminOverrides();
    }
  }, [organizationSettings, isOpen, currentUser?.id]);
  useEffect(() => {
    if (settings?.currentJobSettings) {
      // Merge with defaults to ensure all notification types are present
      const defaults = createDefaultNotificationSettings();
      setLocalSettings({ ...defaults, ...settings.currentJobSettings });
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
      // Merge with defaults to ensure all notification types are present
      const defaults = createDefaultNotificationSettings();
      setLocalSettings({ ...defaults, ...settings.currentJobSettings });
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

  // Filter out notification types that should be hidden in job-level settings
  const HIDDEN_NOTIFICATION_TYPES: EmailNotificationType[] = [
    'userAdded',
    'bulkImportCompleted',
  ];
  const visibleNotificationTypes = ALL_NOTIFICATION_TYPES.filter(
    (type) => !HIDDEN_NOTIFICATION_TYPES.includes(type),
  );

  const hasChanges = () => {
    if (!settings) return false;
    const original = settings.currentJobSettings || {};
    const effective = settings.effectiveSettings || {};
    const compareSource =
      Object.keys(original).length > 0 ? original : effective;

    return visibleNotificationTypes.some((key) => {
      const currentValue = localSettings[key];
      const originalValue = compareSource[key]?.enabled ?? true;
      return currentValue !== originalValue;
    });
  };

  // Calculate if all notifications are enabled (excluding admin-disabled ones)
  const getAllToggleState = () => {
    const toggleableTypes = visibleNotificationTypes.filter(
      (type) => !isAdminOverrideDisabled(type, adminOverrides),
    );
    if (toggleableTypes.length === 0) return false;
    return toggleableTypes.every((type) => localSettings[type]);
  };

  const handleAllToggle = (enabled: boolean) => {
    const newSettings = { ...localSettings };
    visibleNotificationTypes.forEach((type) => {
      // Only toggle types that aren't disabled by admin override
      if (!isAdminOverrideDisabled(type, adminOverrides)) {
        newSettings[type] = enabled;
      }
    });
    setLocalSettings(newSettings);
  };

  const allToggleEnabled = getAllToggleState();
  const hasAdminDisabled = visibleNotificationTypes.some((type) =>
    isAdminOverrideDisabled(type, adminOverrides),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Job Email Notification Settings
          </DialogTitle>
          <span className="mt-1 block text-sm text-muted-foreground">
            Configure email notification preferences for &ldquo;{jobTitle}
            &rdquo; These settings will override your global preferences for
            this job
          </span>
        </DialogHeader>

        {loading ? (
          <EmailNotificationSettingsSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <span>
              Error loading settings:
              {error}
            </span>
          </div>
        ) : (
          <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent max-h-[70vh] flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {/* All Toggle */}
            <div className="mb-2 flex items-center justify-between space-x-4 rounded-t-lg border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
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
              const isDisabled =
                isAdminOverrideDisabled(type, adminOverrides) || updating;
              const source = resolveNotificationSource(
                type,
                adminOverrides,
                settings?.effectiveSettings,
                'job-level',
              );

              return (
                <EmailNotificationToggle
                  key={type}
                  type={type}
                  enabled={localSettings[type]}
                  source={source}
                  onToggle={handleToggle}
                  showSource
                  disabled={isDisabled}
                />
              );
            })}

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
                  {updating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
