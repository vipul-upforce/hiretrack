'use client';

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Define the type for global settings to match the schema
export interface GlobalEmailNotificationSettings {
  newApplications: boolean;
  interviewAssignments: boolean;
  statusUpdates: boolean;
  newRemarks: boolean;
  stepCompleted: boolean;
  mentions: boolean;
  detailsUpdated: boolean;
  meetingScheduled: boolean;
  meetingUpdated: boolean;
  meetingCancelled: boolean;
  meetingInviteAccepted: boolean;
  meetingInviteDeclined: boolean;
  meetingInviteTentative: boolean;
  followupAdded: boolean;
  followupUpdated: boolean;
  followupRemoved: boolean;
  jobCreated: boolean;
  jobUpdated: boolean;
  userAdded: boolean;
  bulkImportCompleted: boolean;
  candidateRejected: boolean;
  interviewCompleted: boolean;
  candidateMoved: boolean;
}

// Hook for getting global email notification settings for the current user
export function useGlobalEmailNotificationSettings() {
  const [settings, setSettings] =
    useState<GlobalEmailNotificationSettings | null>(null);
  const [effectiveSettings, setEffectiveSettings] =
    useState<GlobalEmailNotificationSettings | null>(null);
  const [effectiveSettingsWithSource, setEffectiveSettingsWithSource] =
    useState<Record<string, { enabled: boolean; source: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings/email-notifications/global');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error
            || 'Failed to fetch global email notification settings',
        );
      }

      const data = await response.json();
      setSettings(data.globalSettings);
      setEffectiveSettings(data.effectiveSettings);
      
      // Extract email settings with source information
      if (data.effectiveSettings?.email) {
        setEffectiveSettingsWithSource(data.effectiveSettings.email);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    effectiveSettings,
    effectiveSettingsWithSource,
    loading,
    error,
    refetch: fetchSettings,
  };
}

// Hook for updating global email notification settings for the current user
export function useUpdateGlobalEmailNotificationSettings() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateSettings = async (settings: GlobalEmailNotificationSettings) => {
    setLoading(true);

    try {
      const response = await fetch('/api/settings/email-notifications/global', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error
            || 'Failed to update global email notification settings',
        );
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: 'Global email notification settings updated successfully',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateSettings, loading };
}
