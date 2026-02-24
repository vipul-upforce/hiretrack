'use client';

import { useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmailNotificationType } from '@/components/ui/email-notification-toggle';
import {
  useGetJobEmailNotificationSettingsQuery,
  useGetOrganizationEmailNotificationSettingsQuery,
  useGetUserEmailNotificationSettingsQuery,
  useUpdateJobEmailNotificationSettingsMutation,
  useUpdateOrganizationEmailNotificationSettingsMutation,
  useUpdateUserEmailNotificationSettingsMutation,
} from '@/lib/features/notifications/emailNotificationSettingsApi';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export interface EmailNotificationSettings {
  global: Record<EmailNotificationType, { enabled: boolean; source: string }>;
  jobLevel?: Record<
    string,
    Record<EmailNotificationType, { enabled: boolean; source: string }>
  >; // ✅ Nested for per-job (jobId -> types)
}

export interface UserEmailSettings {
  global: Record<EmailNotificationType, boolean>;
  jobLevel: Record<string, Record<EmailNotificationType, boolean>>;
}

export interface JobEmailSettings {
  [userId: string]: Record<EmailNotificationType, boolean>;
}

export interface OrganizationEmailNotificationSettings {
  defaultSettings: Record<EmailNotificationType, boolean>;
  adminOverrides: Record<string, Record<EmailNotificationType, boolean>>; // userId -> notificationType -> enabled
}

export interface OrganizationSettingsResponse {
  organizationSettings: {
    defaultSettings: Record<EmailNotificationType, boolean>;
    adminOverrides: Record<string, Record<EmailNotificationType, boolean>>;
  };
  users: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    hasCustomSettings: boolean;
    currentOverride: Record<EmailNotificationType, boolean> | null;
  }>;
}

function getRtkQueryErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  // fetchBaseQuery error shape
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

  // serialized error shape
  const se = error as { message?: unknown };
  if (se?.message && typeof se.message === 'string') return se.message;

  return 'Unknown error';
}

// ... (rest of hooks unchanged, but add safety to fetchSettings in useUserEmailNotificationSettings)
export function useUserEmailNotificationSettings(
  userId: string,
  jobId?: string,
) {
  const { toast } = useToast();

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useGetUserEmailNotificationSettingsQuery(
    { userId, jobId },
    { skip: !userId },
  );

  const settings = useMemo<EmailNotificationSettings | null>(() => {
    if (!data?.success) return null;

    // ✅ Normalize response: API returns { email: {...}, inApp: {...}, jobLevel?: { email: {...}, inApp: {...} } }
    // We use common EmailNotificationSettings, so use 'email' property
    const normalizeTypeRecord = <
      T extends Record<string, { enabled: boolean; source: string }>,
    >(
      record: T | undefined,
    ): Record<EmailNotificationType, { enabled: boolean; source: string }> => {
      if (!record) {
        return {} as Record<
          EmailNotificationType,
          { enabled: boolean; source: string }
        >;
      }
      return record as unknown as Record<
        EmailNotificationType,
        { enabled: boolean; source: string }
      >;
    };

    const normalizedSettings: EmailNotificationSettings = {
      global: normalizeTypeRecord(data.settings?.email),
      jobLevel:
        jobId && data.settings?.jobLevel?.email
          ? { [jobId]: normalizeTypeRecord(data.settings.jobLevel.email) }
          : undefined,
    };

    return normalizedSettings;
  }, [data, jobId]);

  const error = queryError ? getRtkQueryErrorMessage(queryError) : null;

  useEffect(() => {
    if (!queryError) return;
    toast({
      title: 'Error',
      description: 'Failed to load email notification settings',
      variant: 'destructive',
    });
  }, [queryError, toast]);

  return {
    settings,
    loading: isLoading || isFetching,
    error,
    refetch,
  };
}

// ... (other hooks unchanged)

// Hook for updating user's email notification settings
export function useUpdateUserEmailNotificationSettings() {
  const { toast } = useToast();
  const [mutate, { isLoading }] =
    useUpdateUserEmailNotificationSettingsMutation();

  const updateSettings = async (
    userId: string,
    updates: {
      global?: Record<EmailNotificationType, boolean>;
      jobLevel?: Record<string, Record<EmailNotificationType, boolean>>;
    },
  ) => {
    try {
      const data = await mutate({ userId, updates }).unwrap();
      toast({
        title: 'Success',
        description: 'Email notification settings updated successfully',
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

// Hook for getting job-specific email notification settings
export function useJobEmailNotificationSettings(jobId: string) {
  const { toast } = useToast();

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useGetJobEmailNotificationSettingsQuery({ jobId }, { skip: !jobId });

  const settings = useMemo(() => {
    if (!data?.success) return null;
    return {
      currentJobSettings: data.currentJobSettings,
      effectiveSettings: data.effectiveSettings,
    };
  }, [data]);

  const error = queryError ? getRtkQueryErrorMessage(queryError) : null;

  useEffect(() => {
    if (!queryError) return;
    toast({
      title: 'Error',
      description: 'Failed to load job email notification settings',
      variant: 'destructive',
    });
  }, [queryError, toast]);

  return {
    settings,
    loading: isLoading || isFetching,
    error,
    refetch,
  };
}

// Hook for updating job-specific email notification settings
export function useUpdateJobEmailNotificationSettings() {
  const { toast } = useToast();
  const [mutate, { isLoading }] =
    useUpdateJobEmailNotificationSettingsMutation();

  const updateSettings = async (
    jobId: string,
    settings: Record<EmailNotificationType, boolean>,
  ) => {
    try {
      const data = await mutate({ jobId, settings }).unwrap();
      toast({
        title: 'Success',
        description: 'Job email notification settings updated successfully',
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

// Hook for getting organization email notification settings (admin only)
export function useOrganizationEmailNotificationSettings() {
  const { toast } = useToast();

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrganizationEmailNotificationSettingsQuery();

  const settings: OrganizationSettingsResponse | null = useMemo(() => {
    if (!data?.success) return null;
    return {
      organizationSettings: data.organizationSettings,
      users: data.users,
    };
  }, [data]);
  const error = queryError ? getRtkQueryErrorMessage(queryError) : null;

  useEffect(() => {
    if (!queryError) return;
    toast({
      title: 'Error',
      description: error ?? 'Failed to load settings',
      variant: 'destructive',
    });
  }, [error, queryError, toast]);

  return { settings, loading: isLoading || isFetching, error, refetch };
}

// Hook for updating organization email notification settings (admin only)
export function useUpdateOrganizationEmailNotificationSettings() {
  const { toast } = useToast();
  const [mutate, { isLoading }] =
    useUpdateOrganizationEmailNotificationSettingsMutation();

  const updateSettings = async (updates: {
    defaultSettings?: Record<EmailNotificationType, boolean>;
    adminOverrides?: Record<string, Record<EmailNotificationType, boolean>>;
  }) => {
    try {
      const data = await mutate({ updates }).unwrap();
      toast({
        title: 'Success',
        description:
          'Organization email notification settings updated successfully',
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
