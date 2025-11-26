"use client";

import React from "react";
import { Form, Formik } from "formik";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VersionInfoSection } from "./version-info-section";
import { UpdateSettingsSection } from "./update-settings-section";
import { ChangelogSection } from "./changelog-section";
import { aboutFormSchema } from "./schema";
import { useAboutVersion } from "./useAboutVersion";
import { AboutValues } from "./types";
import AboutVersionLoadingSkeleton from "./loading-skeleton";

export default function AboutDialog({
  onClose,
}: {
  onClose: (values?: AboutValues) => void;
}) {
  const {
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
  } = useAboutVersion({ onClose });

  if (!initialValues) {
    return <AboutVersionLoadingSkeleton />;
  }

  return (
    <Formik<AboutValues>
      initialValues={initialValues}
      validationSchema={aboutFormSchema}
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
