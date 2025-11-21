"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import React, { useEffect, useState, useCallback } from "react";
import packageJson from "../../../../../package.json";
import { Download, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useGetAutoUpdateQuery,
  useToggleAutoUpdateMutation,
  useLazyGetVersionListQuery,
  useTriggerUpdateMutation,
} from "@/lib/features/settings/settingsApi";
import { VersionInfoSection } from "./about-version/version-info-section";
import { UpdateSettingsSection } from "./about-version/update-settings-section";
import { ChangelogSection } from "./about-version/changelog-section";

export interface AboutValues {
  enableAutoUpdate: boolean;
}

export interface VersionInfo {
  version: string;
  tagName: string;
  platforms: string[];
  publishedAt: string;
  isPrerelease: boolean;
  isDraft: boolean;
  releaseNotes: string;
  releaseUrl: string;
  assetCount: number;
}

export interface VersionListResponse {
  totalVersions: number;
  latestVersion: string;
  versions: VersionInfo[];
}

export default function AboutDialog({
  onClose,
}: {
  onClose: (values?: AboutValues) => void;
}) {
  const { toast } = useToast();

  const [initialValues, setInitialValues] = useState<AboutValues | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionList, setVersionList] = useState<VersionListResponse | null>(
    null
  );
  const [changelogVersions, setChangelogVersions] = useState<VersionInfo[]>([]);

  const { data: autoUpdateData, error: autoUpdateError } =
    useGetAutoUpdateQuery();
  const [toggleAutoUpdate] = useToggleAutoUpdateMutation();
  const [fetchVersionListRTK, { isFetching: checkingUpdatesRTK }] =
    useLazyGetVersionListQuery();
  const [triggerUpdateRTK, { isLoading: updatingRTK }] =
    useTriggerUpdateMutation();

  const currentVersion = packageJson.version;

  useEffect(() => {
    if (autoUpdateData?.autoUpdate !== undefined) {
      setInitialValues({ enableAutoUpdate: autoUpdateData.autoUpdate });
      return;
    }

    if (autoUpdateError) {
      setInitialValues({ enableAutoUpdate: false });
    }
  }, [autoUpdateData, autoUpdateError]);

  const validationSchema = Yup.object({
    enableAutoUpdate: Yup.boolean(),
  });

  const handleCheckForUpdates = useCallback(async () => {
    try {
      const versionData = await fetchVersionListRTK().unwrap();
      setVersionList(versionData);

      const latest = versionData.latestVersion;
      setLatestVersion(latest);

      if (latest !== currentVersion) {
        setUpdateAvailable(true);

        const currentIndex = versionData.versions.findIndex(
          (v) => v.version === currentVersion
        );
        const latestIndex = versionData.versions.findIndex(
          (v) => v.version === latest
        );

        if (currentIndex > latestIndex) {
          setChangelogVersions(
            versionData.versions.slice(latestIndex, currentIndex)
          );
        } else {
          setChangelogVersions(versionData.versions.slice(0, latestIndex + 1));
        }

        toast({
          title: "Update Available",
          description: `New version ${latest} is available. Current version: ${currentVersion}`,
        });
      } else {
        setUpdateAvailable(false);
        setChangelogVersions([]);

        toast({
          title: "Up to Date",
          description: "You are running the latest version.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to check for updates",
        variant: "destructive",
      });
    }
  }, [currentVersion, fetchVersionListRTK, toast]);

  const handleUpdate = useCallback(async () => {
    try {
      await triggerUpdateRTK().unwrap();

      toast({
        title: "Update Started",
        description:
          "The update process has begun. Expected downtime in ~1 minute.",
      });

      setTimeout(() => {
        toast({
          title: "Expected Downtime",
          description: "The system may experience a brief downtime.",
          variant: "destructive",
          duration: 10000,
        });
      }, 60000);

      onClose();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to start update",
        variant: "destructive",
      });
    }
  }, [triggerUpdateRTK, toast, onClose]);

  const handleSubmit = useCallback(
    async (values: AboutValues, { setSubmitting }) => {
      try {
        if (
          initialValues &&
          values.enableAutoUpdate !== initialValues.enableAutoUpdate
        ) {
          const result = await toggleAutoUpdate().unwrap();

          toast({
            title: "Success",
            description: "Auto-update settings updated successfully",
          });

          setInitialValues({ enableAutoUpdate: !!result.autoUpdate });
          onClose({ enableAutoUpdate: !!result.autoUpdate });
        } else {
          onClose(values);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Failed to update settings",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [initialValues, toggleAutoUpdate, toast, onClose]
  );

  if (!initialValues) {
    return (
      <div className="px-6 py-4 space-y-6">
        <Skeleton className="h-8 w-full" />
        <div className="flex justify-between gap-2 border-t pt-1">
          <Skeleton className="h-8 w-60 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <Formik<AboutValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
        <Form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="max-h-[60vh] overflow-y-scroll">
            <VersionInfoSection
              currentVersion={currentVersion}
              latestVersion={latestVersion}
              updateAvailable={updateAvailable}
            />

            <UpdateSettingsSection
              values={values}
              setFieldValue={setFieldValue}
              isSubmitting={isSubmitting}
              handleCheckForUpdates={handleCheckForUpdates}
              checkingUpdatesRTK={checkingUpdatesRTK}
              updateAvailable={updateAvailable}
              versionList={versionList}
            />

            <ChangelogSection
              changelogVersions={changelogVersions}
              currentVersion={currentVersion}
              latestVersion={latestVersion}
            />
          </div>

          {updateAvailable && (
            <div className="pt-4">
              <Button
                type="button"
                onClick={handleUpdate}
                disabled={updatingRTK}
                className="w-full"
                style={{ backgroundColor: "var(--portal-primary)" }}
              >
                {updatingRTK ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Update now
                  </>
                )}
              </Button>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
}
