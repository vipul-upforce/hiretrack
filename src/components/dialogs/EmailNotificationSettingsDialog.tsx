'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Shield } from 'lucide-react';

import {
  EmailNotificationToggle,
  EmailNotificationType,
} from '@/components/ui/email-notification-toggle';
import {
  useOrganizationEmailNotificationSettings,
  useUpdateOrganizationEmailNotificationSettings,
} from '@/hooks/useEmailNotificationSettings';

import { useToast } from '@/hooks/use-toast';
import EmailNotificationSettingsSkeleton from './email-notification-settings-skeleton';

// All email types (enabled by default)
const DEFAULT_NOTIFICATION_TYPES: EmailNotificationType[] = [
  'newApplications',
  'interviewAssignments',
  'statusUpdates',
  'newRemarks',
  'stepCompleted',
  'mentions',
  'detailsUpdated',
  'meetingScheduled',
  'meetingUpdated',
  'meetingCancelled',
  'meetingInviteAccepted',
  'meetingInviteDeclined',
  'meetingInviteTentative',
  'interviewCompleted',
  'followupAdded',
  'followupUpdated',
  'followupRemoved',
  'jobCreated',
  'jobUpdated',
  'userAdded',
  'bulkImportCompleted',
  'candidateRejected',
  'candidateMoved',
] as const;

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

  const {
    settings: organizationSettings,
    loading,
    error,
    refetch,
  } = useOrganizationEmailNotificationSettings();

  const { updateSettings, loading: updating } =
    useUpdateOrganizationEmailNotificationSettings();

  const [adminOverrides, setAdminOverrides] = useState<
    Partial<Record<EmailNotificationType, boolean>>
  >({});
  const [initialAdminOverrides, setInitialAdminOverrides] = useState<
    Partial<Record<EmailNotificationType, boolean>>
  >({});

  const notificationTypes = DEFAULT_NOTIFICATION_TYPES;

  // Type-safe helper to get override value
  const getOverrideValue = (
    overrides: Partial<Record<EmailNotificationType, boolean>>,
    type: EmailNotificationType,
  ): boolean | undefined => {
    const entry = Object.entries(overrides).find(([key]) => key === type);
    return entry ? (entry[1] as boolean) : undefined;
  };

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

  const hasChanges = () =>
    notificationTypes.some(
      (type) =>
        getOverrideValue(adminOverrides, type) !==
        getOverrideValue(initialAdminOverrides, type),
    );

  const allToggleEnabled =
    notificationTypes.length > 0 &&
    notificationTypes.every(
      (type) => getOverrideValue(adminOverrides, type) ?? true,
    );

  const handleAllToggle = (enabled: boolean) => {
    const newOverrides = Object.fromEntries(
      notificationTypes.map((type) => [type, enabled]),
    ) as Partial<Record<EmailNotificationType, boolean>>;
    setAdminOverrides(newOverrides);
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        adminOverrides: {
          [userId]: adminOverrides as Record<EmailNotificationType, boolean>,
        },
      });

      toast({
        title: 'Success',
        description: 'Admin override settings updated successfully.',
      });

      await refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to save admin overrides.',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    if (loading) {
      return <EmailNotificationSettingsSkeleton />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8 text-red-500">
          Failed to load settings: {error}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        {/* Fixed section below header */}
        <div className="border-b bg-background px-6 py-2">
          <div className="flex items-center justify-between space-x-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
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
        <div className="scrollbar-thin scrollbar-thumb-gray-300 max-h-[50vh] flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-0">
            {notificationTypes.map((type) => (
              <EmailNotificationToggle
                key={type}
                type={type}
                enabled={getOverrideValue(adminOverrides, type) ?? true}
                disabled={updating}
                onToggle={handleToggle}
                source="admin-override"
                showSource
              />
            ))}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between border-t bg-background px-6 py-2">
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
            Email Notification Settings
          </DialogTitle>

          {/* <DialogDescription> */}
          <div className="mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Admin Override Mode
            </span>
          </div>
          <span className="mt-2 block text-sm text-muted-foreground">
            Configure which notifications are enabled or disabled for {userName}
            . These settings cannot be changed by the user.
          </span>
          {/* </DialogDescription> */}
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
