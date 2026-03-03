import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import packageJson from '@/../package.json';
import {
  useGetAutoUpdateQuery,
  useToggleAutoUpdateMutation,
  useLazyGetVersionListQuery,
  useTriggerUpdateMutation,
} from '@/lib/features/settings';
import { FormikHelpers } from 'formik';
import { AboutValues, VersionListResponse, VersionInfo } from '../types';

interface UseAboutVersionProps {
  onClose: (values?: AboutValues) => void;
}

type ReleaseChannel = 'beta' | 'staging' | 'production';

const UPDATE_COOLDOWN_STORAGE_KEY = 'aboutUpdateCooldownUntil';
const UPDATE_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

// Helper to safely extract error messages
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
};

export const useAboutVersion = ({ onClose }: UseAboutVersionProps) => {
  const { toast } = useToast();

  const [initialValues, setInitialValues] = useState<AboutValues | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [channel, setChannel] = useState<ReleaseChannel>('production');
  const [updateCooldownUntil, setUpdateCooldownUntil] = useState<number | null>(
    null,
  );
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [versionList, setVersionList] = useState<VersionListResponse | null>(
    null,
  );
  const [changelogVersions, setChangelogVersions] = useState<VersionInfo[]>([]);

  const { data: autoUpdateData, error: autoUpdateError } =
    useGetAutoUpdateQuery();
  const [toggleAutoUpdate] = useToggleAutoUpdateMutation();
  const [fetchVersionListRTK, { isFetching: checkingUpdatesRTK }] =
    useLazyGetVersionListQuery();
  const [triggerUpdateRTK, { isLoading: updatingRTK }] =
    useTriggerUpdateMutation();

  const normalizeChannel = (value: unknown): ReleaseChannel => {
    if (value === 'beta' || value === 'staging' || value === 'production') {
      return value;
    }
    return 'production';
  };

  const currentVersion = packageJson.version;
  const updateCooldownRemainingMs = updateCooldownUntil
    ? Math.max(0, updateCooldownUntil - nowTimestamp)
    : 0;
  const isUpdateNowDisabled = updatingRTK || updateCooldownRemainingMs > 0;

  // Initialize Auto Update Settings
  useEffect(() => {
    if (autoUpdateData?.autoUpdate !== undefined) {
      setInitialValues({ enableAutoUpdate: autoUpdateData.autoUpdate });
      setChannel(normalizeChannel(autoUpdateData.channel));
      return;
    }

    if (autoUpdateError) {
      setInitialValues({ enableAutoUpdate: false });
      setChannel('production');
    }
  }, [autoUpdateData, autoUpdateError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedCooldown = window.localStorage.getItem(
      UPDATE_COOLDOWN_STORAGE_KEY,
    );
    if (!storedCooldown) return;

    const parsedCooldown = Number(storedCooldown);
    if (Number.isFinite(parsedCooldown) && parsedCooldown > Date.now()) {
      setUpdateCooldownUntil(parsedCooldown);
      return;
    }

    window.localStorage.removeItem(UPDATE_COOLDOWN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!updateCooldownUntil) return undefined;

    const timer = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [updateCooldownUntil]);

  useEffect(() => {
    if (!updateCooldownUntil || nowTimestamp < updateCooldownUntil) return;

    setUpdateCooldownUntil(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(UPDATE_COOLDOWN_STORAGE_KEY);
    }
  }, [nowTimestamp, updateCooldownUntil]);

  const handleCheckForUpdates = useCallback(async () => {
    try {
      const versionData = await fetchVersionListRTK().unwrap();
      setVersionList(versionData);

      const latest = versionData.latestVersion;
      setLatestVersion(latest);

      if (latest !== currentVersion) {
        setUpdateAvailable(true);

        const currentIndex = versionData.versions.findIndex(
          (v: VersionInfo) => v.version === currentVersion,
        );
        const latestIndex = versionData.versions.findIndex(
          (v: VersionInfo) => v.version === latest,
        );

        if (currentIndex > latestIndex) {
          setChangelogVersions(
            versionData.versions.slice(latestIndex, currentIndex),
          );
        } else {
          setChangelogVersions(versionData.versions.slice(0, latestIndex + 1));
        }

        toast({
          title: 'Update Available',
          description: `New version ${latest} is available. Current version: ${currentVersion}`,
        });
      } else {
        setUpdateAvailable(false);
        setChangelogVersions([]);

        toast({
          title: 'Up to Date',
          description: 'You are running the latest version.',
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to check for updates'),
        variant: 'destructive',
      });
    }
  }, [currentVersion, fetchVersionListRTK, toast]);

  const handleUpdate = useCallback(async () => {
    try {
      await triggerUpdateRTK().unwrap();
      const cooldownUntil = Date.now() + UPDATE_COOLDOWN_MS;

      setUpdateCooldownUntil(cooldownUntil);
      setNowTimestamp(Date.now());
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          UPDATE_COOLDOWN_STORAGE_KEY,
          String(cooldownUntil),
        );
      }

      toast({
        title: 'Update Started',
        description:
          'The update process has begun. Expected downtime in ~1 minute.',
      });

      setTimeout(() => {
        toast({
          title: 'Expected Downtime',
          description: 'The system may experience a brief downtime.',
          variant: 'destructive',
          duration: 10000,
        });
      }, 60000);

      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to start update'),
        variant: 'destructive',
      });
    }
  }, [triggerUpdateRTK, toast, onClose]);

  const handleSubmit = useCallback(
    async (
      values: AboutValues,
      { setSubmitting }: FormikHelpers<AboutValues>,
    ) => {
      try {
        if (
          initialValues &&
          values.enableAutoUpdate !== initialValues.enableAutoUpdate
        ) {
          const result = await toggleAutoUpdate().unwrap();

          toast({
            title: 'Success',
            description: 'Auto-update settings updated successfully',
          });

          setInitialValues({ enableAutoUpdate: !!result.autoUpdate });
          onClose({ enableAutoUpdate: !!result.autoUpdate });
        } else {
          onClose(values);
        }
      } catch (error: unknown) {
        toast({
          title: 'Error',
          description: getErrorMessage(error, 'Failed to update settings'),
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [initialValues, toggleAutoUpdate, toast, onClose],
  );

  return {
    initialValues,
    currentVersion,
    latestVersion,
    updateAvailable,
    channel,
    versionList,
    changelogVersions,
    checkingUpdatesRTK,
    updatingRTK,
    isUpdateNowDisabled,
    updateCooldownRemainingMs,
    handleCheckForUpdates,
    handleUpdate,
    handleSubmit,
  };
};
