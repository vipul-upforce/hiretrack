'use client';

import { useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetGlobalEmailNotificationSettingsQuery,
  useUpdateGlobalEmailNotificationSettingsMutation,
} from '@/lib/features/notifications/emailNotificationSettingsApi';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

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

function getRtkQueryErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  const fbq = error as FetchBaseQueryError;
  if (typeof fbq === 'object' && fbq && 'status' in fbq) {
    const maybeData = (fbq as { data?: unknown }).data;
    if (
      maybeData &&
      typeof maybeData === 'object' &&
      'error' in (maybeData as Record<string, unknown>)
    ) {
      const msg = (maybeData as Record<string, unknown>).error;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    if (typeof maybeData === 'string' && maybeData.trim()) return maybeData;
    return 'Request failed';
  }

  const se = error as { message?: unknown };
  if (se?.message && typeof se.message === 'string') return se.message;

  return 'Unknown error';
}

// Hook for getting global email notification settings for the current user
export function useGlobalEmailNotificationSettings() {
  const { toast } = useToast();

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useGetGlobalEmailNotificationSettingsQuery();

  const settings = useMemo(
    () => (data?.success ? data.globalSettings : null),
    [data],
  );

  // This hook historically exposed `effectiveSettings` as a plain boolean map,
  // but the API returns `effectiveSettings.email` as { enabled, source }.
  // Keep backward-compat by returning the raw `effectiveSettings` object here.
  const effectiveSettings = useMemo(
    () =>
      data?.success
        ? (data.effectiveSettings as unknown as GlobalEmailNotificationSettings)
        : null,
    [data],
  );

  const effectiveSettingsWithSource = useMemo(() => {
    if (!data?.success) return null;
    return data.effectiveSettings?.email ?? null;
  }, [data]);

  const error = queryError ? getRtkQueryErrorMessage(queryError) : null;

  useEffect(() => {
    if (!queryError) return;
    toast({
      title: 'Error',
      description: error ?? 'Failed to load global email notification settings',
      variant: 'destructive',
    });
  }, [error, queryError, toast]);

  return {
    settings,
    effectiveSettings,
    effectiveSettingsWithSource,
    loading: isLoading || isFetching,
    error,
    refetch,
  };
}

// Hook for updating global email notification settings for the current user
export function useUpdateGlobalEmailNotificationSettings() {
  const { toast } = useToast();
  const [mutate, { isLoading }] =
    useUpdateGlobalEmailNotificationSettingsMutation();

  const updateSettings = async (settings: GlobalEmailNotificationSettings) => {
    try {
      const data = await mutate({ settings }).unwrap();
      toast({
        title: 'Success',
        description: 'Global email notification settings updated successfully',
      });

      return data;
    } catch (err) {
      const errorMessage = getRtkQueryErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  return { updateSettings, loading: isLoading };
}
