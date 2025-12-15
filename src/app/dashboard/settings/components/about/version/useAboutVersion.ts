import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import packageJson from '@/../package.json';
import {
  useGetAutoUpdateQuery,
  useToggleAutoUpdateMutation,
  useLazyGetVersionListQuery,
  useTriggerUpdateMutation,
} from '@/lib/features/settings/settingsApi';
import { FormikHelpers } from 'formik';
import { AboutValues, VersionListResponse, VersionInfo } from '../types';

interface UseAboutVersionProps {
  onClose: (values?: AboutValues) => void;
}

export const useAboutVersion = ({ onClose }: UseAboutVersionProps) => {
  const { toast } = useToast();

  const [initialValues, setInitialValues] = useState<AboutValues | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionList, setVersionList] = useState<VersionListResponse | null>(
    null,
  );
  const [changelogVersions, setChangelogVersions] = useState<VersionInfo[]>([]);

  const { data: autoUpdateData, error: autoUpdateError } = useGetAutoUpdateQuery();
  const [toggleAutoUpdate] = useToggleAutoUpdateMutation();
  const [fetchVersionListRTK, { isFetching: checkingUpdatesRTK }] = useLazyGetVersionListQuery();
  const [triggerUpdateRTK, { isLoading: updatingRTK }] = useTriggerUpdateMutation();

  const currentVersion = packageJson.version;

  // Initialize Auto Update Settings
  useEffect(() => {
    if (autoUpdateData?.autoUpdate !== undefined) {
      setInitialValues({ enableAutoUpdate: autoUpdateData.autoUpdate });
      return;
    }

    if (autoUpdateError) {
      setInitialValues({ enableAutoUpdate: false });
    }
  }, [autoUpdateData, autoUpdateError]);

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
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Failed to check for updates',
        variant: 'destructive',
      });
    }
  }, [currentVersion, fetchVersionListRTK, toast]);

  const handleUpdate = useCallback(async () => {
    try {
      await triggerUpdateRTK().unwrap();

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
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Failed to start update',
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
          initialValues
          && values.enableAutoUpdate !== initialValues.enableAutoUpdate
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
      } catch (e: any) {
        toast({
          title: 'Error',
          description: e?.message || 'Failed to update settings',
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
    versionList,
    changelogVersions,
    checkingUpdatesRTK,
    updatingRTK,
    handleCheckForUpdates,
    handleUpdate,
    handleSubmit,
  };
};
