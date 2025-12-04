"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmailNotificationType } from "@/components/ui/email-notification-toggle";

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

// ... (rest of hooks unchanged, but add safety to fetchSettings in useUserEmailNotificationSettings)
export function useUserEmailNotificationSettings(
  userId: string,
  jobId?: string
) {
  const [settings, setSettings] = useState<EmailNotificationSettings | null>(
    null
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
        throw new Error("Failed to fetch email notification settings");
      }

      const data = await response.json();

      // ✅ Normalize response: API returns { email: {...}, inApp: {...}, jobLevel?: { email: {...}, inApp: {...} } }
      // We use common EmailNotificationSettings, so use 'email' property
      // Convert NotificationType enum keys to EmailNotificationType string keys
      const normalizeTypeRecord = <
        T extends Record<string, { enabled: boolean; source: string }>,
      >(
        record: T | undefined
      ): Record<
        EmailNotificationType,
        { enabled: boolean; source: string }
      > => {
        if (!record)
          return {} as Record<
            EmailNotificationType,
            { enabled: boolean; source: string }
          >;
        // NotificationType enum values are strings, so they're compatible with EmailNotificationType
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

      setSettings(normalizedSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load email notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [userId, jobId]);

  return { settings, loading, error, refetch: fetchSettings };
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
    }
  ) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/settings/email-notifications/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update email notification settings"
        );
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: "Email notification settings updated successfully",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
        `/api/settings/email-notifications/job/${jobId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch job email notification settings");
      }

      const data = await response.json();
      setSettings({
        currentJobSettings: data.currentJobSettings,
        effectiveSettings: data.effectiveSettings,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load job email notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [jobId]);

  return { settings, loading, error, refetch: fetchSettings };
}

// Hook for updating job-specific email notification settings
export function useUpdateJobEmailNotificationSettings() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateSettings = async (
    jobId: string,
    settings: Record<EmailNotificationType, boolean>
  ) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/settings/email-notifications/job/${jobId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update job email notification settings"
        );
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: "Job email notification settings updated successfully",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateSettings, loading };
}

// Hook for getting organization email notification settings (admin only)
export function useOrganizationEmailNotificationSettings() {
  const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/email-notifications");

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Admin access required");
        }
        throw new Error(
          "Failed to fetch organization email notification settings"
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch settings");
      }

      setSettings(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, error, refetch: fetchSettings };
}

// Hook for updating organization email notification settings (admin only)
export function useUpdateOrganizationEmailNotificationSettings() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateSettings = async (updates: {
    defaultSettings?: Record<EmailNotificationType, boolean>;
    adminOverrides?: Record<string, Record<EmailNotificationType, boolean>>;
  }) => {
    setLoading(true);

    try {
      const response = await fetch("/api/settings/email-notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Admin access required");
        }
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Failed to update organization email notification settings"
        );
      }

      const data = await response.json();

      toast({
        title: "Success",
        description:
          "Organization email notification settings updated successfully",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateSettings, loading };
}
