  'use client';

  import React from 'react';
  import { Form, Formik } from 'formik';
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
  import { Button } from '@/components/ui/button';
  import { Download, Loader2 } from 'lucide-react';
  import { VersionInfoSection } from './version/version-info-section';
  import { UpdateSettingsSection } from './version/update-settings-section';
  import { ChangelogSection } from './version/changelog-section';
  import { DiskSpaceSection } from './disk-space';
  import { aboutFormSchema } from './schema';
  import { useAboutVersion } from './version/useAboutVersion';
  import { AboutValues } from './types';
  import AboutVersionLoadingSkeleton from './loading-skeleton';
  import { CronTimezoneSection } from './cronjob/cron-timezone-selection';

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
    } = useAboutVersion({ onClose });

    if (!initialValues) return <AboutVersionLoadingSkeleton />;

    return (
      <Formik<AboutValues>
        initialValues={initialValues}
        validationSchema={aboutFormSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({
          values,
          setFieldValue,
          handleSubmit: handleSubmitFormik,
          isSubmitting,
        }) => (
          <Form onSubmit={handleSubmitFormik} className="flex h-full flex-col">
            <Tabs defaultValue="version" className="flex h-full w-full flex-col">
              {/* TAB HEADERS */}
              <TabsList className="mb-4 grid w-[95%] grid-cols-2 self-center text-center">
                <TabsTrigger value="version">Version</TabsTrigger>
                <TabsTrigger value="disk">Disk Space</TabsTrigger>
              </TabsList>

              <TabsContent value="version" className="flex h-full flex-col">
                <div className="max-h-[60vh] overflow-y-scroll">
                  <VersionInfoSection
                    currentVersion={currentVersion}
                    latestVersion={latestVersion}
                    updateAvailable={updateAvailable}
                  />

                  <CronTimezoneSection />

                  <UpdateSettingsSection
                    values={values}
                    setFieldValue={setFieldValue}
                    isSubmitting={isSubmitting}
                    handleCheckForUpdates={handleCheckForUpdates}
                    checkingUpdatesRTK={checkingUpdatesRTK}
                    updateAvailable={updateAvailable}
                    channel={channel}
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
                      disabled={isUpdateNowDisabled}
                      className="w-full"
                      style={{ backgroundColor: 'var(--portal-primary)' }}
                    >
                      {updatingRTK ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          {updateCooldownRemainingMs > 0
                            ? `Updating the latest version.`
                            : 'Update now'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="disk" className="flex-1 overflow-y-scroll">
                <DiskSpaceSection />
              </TabsContent>
            </Tabs>
          </Form>
        )}
      </Formik>
    );
  }
