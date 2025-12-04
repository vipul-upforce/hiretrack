'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmailNotificationType } from '@/components/ui/email-notification-toggle';

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

// ... (rest of hooks unchanged, but add safety to fetchSettings in useUserEmailNotificationSettings)
export function useUserEmailNotificationSettings(
  userId: string,
  jobId?: string,
) {
  const [settings, setSettings] = useState<EmailNotificationSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const url = jobId
        ? `/api/settings/email-notifications/${userId}?jobId=${jobId}`
        : `/api/settings/email-notifications/${userId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch email notification settings');
      }

      const data = await response.json();

      // ✅ Normalize response: Ensure global exists (fallback to empty if missing)
      const normalizedSettings: EmailNotificationSettings = {
        global: data.settings?.global || data.settings?.email || {},
        jobLevel: data.settings?.jobLevel || data.settings?.email || {},
      };

      setSettings(normalizedSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load email notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [userId, jobId]);

  return {
    settings, loading, error, refetch: fetchSettings,
  };
}

// ... (other hooks unchanged)

// Hook for updating user's email notification settings
export function useUpdateUserEmailNotificationSettings() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateSettings = async (
    userId: string,
    updates: {
      global?: Record<EmailNotificationType, boolean>;
      jobLevel?: Record<string, Record<EmailNotificationType, boolean>>;
    },
  ) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/settings/email-notifications/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to update email notification settings',
        );
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: 'Email notification settings updated successfully',
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

// Hook for getting job-specific email notification settings
export function useJobEmailNotificationSettings(jobId: string) {
  const [settings, setSettings] = useState<{
    currentJobSettings: Record<EmailNotificationType, boolean> | null;
    effectiveSettings: Record<
      EmailNotificationType,
      { enabled: boolean; source: string }
    >;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!jobId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/settings/email-notifications/job/${jobId}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch job email notification settings');
      }

      const data = await response.json();
      setSettings({
        currentJobSettings: data.currentJobSettings,
        effectiveSettings: data.effectiveSettings,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load job email notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [jobId]);

  return {
    settings, loading, error, refetch: fetchSettings,
  };
}

// Hook for updating job-specific email notification settings
export function useUpdateJobEmailNotificationSettings() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateSettings = async (
    jobId: string,
    settings: Record<EmailNotificationType, boolean>,
  ) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/settings/email-notifications/job/${jobId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ settings }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to update job email notification settings',
        );
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: 'Job email notification settings updated successfully',
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
