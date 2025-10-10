"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import React, { useEffect, useState, useCallback } from "react";
import packageJson from "../../../../../package.json";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Info,
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export interface AboutValues {
  enableAutoUpdate: boolean;
}

interface VersionInfo {
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

interface VersionListResponse {
  totalVersions: number;
  latestVerson: string;
  versions: VersionInfo[];
}

// Reusable API functions
async function fetchAutoUpdateValue(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/settings/auto-update", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.autoUpdate === "boolean") {
      return data.autoUpdate;
    }
    return null;
  } catch {
    return null;
  }
}

async function updateAutoUpdateValue(): Promise<{
  autoUpdate?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/settings/auto-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: "Failed to update auto-update setting" };
  }
}

async function fetchVersionList(): Promise<VersionListResponse | null> {
  try {
    const res = await fetch("/api/version/list", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

async function triggerUpdate(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/system/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { success: false, error: "Failed to trigger update" };
  }
}

export default function AboutDialog({
  onClose,
}: {
  onClose: (values?: AboutValues) => void;
}) {
  const { toast } = useToast();
  const [initialValues, setInitialValues] = useState<AboutValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionList, setVersionList] = useState<VersionListResponse | null>(
    null
  );
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [changelogVersions, setChangelogVersions] = useState<VersionInfo[]>([]);

  const currentVersion = packageJson.version;

  // Fetch the current autoUpdate value from the API
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAutoUpdateValue().then((autoUpdate) => {
      if (mounted) {
        setInitialValues({ enableAutoUpdate: !!autoUpdate });
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const validationSchema = Yup.object({
    enableAutoUpdate: Yup.boolean(),
  });

  // Check for updates
  const handleCheckForUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    try {
      const versionData = await fetchVersionList();
      if (versionData) {
        setVersionList(versionData);
        const latestVersion = versionData.latestVerson;

        if (latestVersion !== currentVersion) {
          setUpdateAvailable(true);
          // Get versions between current and latest (excluding current version)
          const currentIndex = versionData.versions.findIndex(
            (v) => v.version === currentVersion
          );
          const latestIndex = versionData.versions.findIndex(
            (v) => v.version === latestVersion
          );

          if (
            currentIndex !== -1 &&
            latestIndex !== -1 &&
            latestIndex < currentIndex
          ) {
            // Get all versions from latest to current (excluding current)
            const versionsToShow = versionData.versions.slice(
              latestIndex,
              currentIndex
            );
            setChangelogVersions(versionsToShow);
          } else if (latestIndex !== -1) {
            // If current version not found in list, show all versions up to latest
            const versionsToShow = versionData.versions.slice(
              0,
              latestIndex + 1
            );
            setChangelogVersions(versionsToShow);
          }

          toast({
            title: "Update Available",
            description: `New version ${latestVersion} is available. Current version: ${currentVersion}`,
          });
        } else {
          setUpdateAvailable(false);
          setChangelogVersions([]);
          toast({
            title: "Up to Date",
            description: "You are running the latest version.",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to check for updates",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to check for updates",
        variant: "destructive",
      });
    } finally {
      setCheckingUpdates(false);
    }
  }, [currentVersion, toast]);

  // Trigger update
  const handleUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      const result = await triggerUpdate();
      if (result.success) {
        toast({
          title: "Update Started",
          description:
            "The update process has been initiated. You can expect a brief downtime in about a minute.",
        });

        // Show downtime alert after a delay
        setTimeout(() => {
          toast({
            title: "Expected Downtime",
            description:
              "The system may experience a brief downtime as the update is being applied. Please wait a few moments.",
            variant: "destructive",
            duration: 10000, // Show for 10 seconds
          });
        }, 60000); // 1 minute delay

        onClose();
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to start the update process",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to trigger update",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  }, [toast, onClose]);

  // Handles the form submit and updates the config via API
  const handleSubmit = useCallback(
    async (
      values: AboutValues,
      { setSubmitting }: { setSubmitting: (b: boolean) => void }
    ) => {
      setSubmitting(true);
      try {
        // The API toggles the value, so only call if the value is different
        if (
          initialValues &&
          values.enableAutoUpdate !== initialValues.enableAutoUpdate
        ) {
          const result = await updateAutoUpdateValue();
          if (result.error) {
            throw new Error(result.error);
          }
          toast({
            title: "Success",
            description: "Auto-update settings updated successfully",
          });
          setInitialValues({ enableAutoUpdate: !!result.autoUpdate });
          onClose({ enableAutoUpdate: !!result.autoUpdate });
        } else {
          // No change, just close
          onClose(values);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Failed to update auto-update settings",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [initialValues, toast, onClose]
  );

  if (loading || !initialValues) {
    return (
      <div className="flex items-center justify-center py-8">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Formik<AboutValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
          <Form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-6 py-4 space-y-6">
              {/* Version Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About HireTrack
                  </CardTitle>
                  <CardDescription>
                    Application version and update information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Version</span>
                    <Badge variant="secondary">{currentVersion}</Badge>
                  </div>

                  {versionList && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Latest Version
                      </span>
                      <Badge
                        variant={updateAvailable ? "destructive" : "default"}
                      >
                        {versionList.latestVerson}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Auto Update Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Update Settings</CardTitle>
                  <CardDescription>
                    Configure automatic update preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableAutoUpdate"
                      checked={values.enableAutoUpdate}
                      onCheckedChange={(checked) =>
                        setFieldValue("enableAutoUpdate", Boolean(checked))
                      }
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="enableAutoUpdate">Enable Auto-Update</Label>
                  </div>
                  <ErrorMessage
                    name="enableAutoUpdate"
                    component="div"
                    className="text-red-500 text-sm mt-2"
                  />
                </CardContent>
              </Card>

              {/* Check for Updates */}
              <Card>
                <CardHeader>
                  <CardTitle>Check for Updates</CardTitle>
                  <CardDescription>
                    Manually check for available updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckForUpdates}
                    disabled={checkingUpdates}
                    className="w-full"
                  >
                    {checkingUpdates ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking for Updates...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Check for Updates
                      </>
                    )}
                  </Button>

                  {updateAvailable && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        An update is available! Review the changelog below and
                        click "Update Now" to proceed.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!updateAvailable && versionList && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        You are running the latest version.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Changelog */}
              {changelogVersions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>What's New</CardTitle>
                    <CardDescription>
                      Changes from version {currentVersion} to{" "}
                      {versionList?.latestVerson}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {changelogVersions
                      .sort(
                        (a, b) =>
                          new Date(b.publishedAt).getTime() -
                          new Date(a.publishedAt).getTime()
                      )
                      .map((version, index) => (
                        <div key={version.version} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{version.version}</Badge>
                              {version.isPrerelease && (
                                <Badge variant="secondary" className="text-xs">
                                  Pre-release
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                version.publishedAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                            {version.releaseNotes}
                          </div>
                          {index < changelogVersions.length - 1 && (
                            <Separator />
                          )}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Update Button */}
              {updateAvailable && (
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      type="button"
                      onClick={handleUpdate}
                      disabled={updating}
                      className="w-full"
                      variant="default"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Update Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
                disabled={isSubmitting || updating}
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || updating}
                variant="primary"
              >
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
