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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Info,
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Skeleton } from "@/components/ui/skeleton";

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
  latestVersion: string;
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
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
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
        const latestVersion = versionData.latestVersion;
        setLatestVersion(latestVersion);
        debugger;

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
      <div className="px-6 py-4 space-y-6 animate-in fade-in duration-200">
        <div className="space-y-1">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex justify-between gap-2 border-t border-border/10 pt-1">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
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
            <div className="  ">
              {/* Version Information */}
              {/* <Card className="border-none shadow-none p-0"> */}
              {/* <CardHeader className="pt-0 pb-3">
                  <CardTitle className="flex items-center gap-2 text-balance">
                    <Info className="h-5 w-5" />
                    About HireTrack
                  </CardTitle>
                  <CardDescription className="text-pretty">
                    Application version and update information
                  </CardDescription>
                </CardHeader> */}
              {/* <CardContent> */}
              {/* </CardContent> */}
              {/* </Card> */}
              <div className="flex flex-row gap-3 px-5">
                <div
                  className={`flex items-center justify-between rounded-md border bg-background p-3 ${latestVersion ? "w-[50%]" : "w-full"}`}
                >
                  <span className="text-sm text-muted-foreground">
                    Current Version
                  </span>
                  <Badge variant="secondary">{currentVersion}</Badge>
                </div>
                {latestVersion && (
                  <div className="flex items-center justify-between rounded-md border bg-background p-3 w-[50%]">
                    <span className="text-sm text-muted-foreground">
                      Latest Version
                    </span>
                    <Badge
                      variant={updateAvailable ? "destructive" : "default"}
                    >
                      {latestVersion}
                    </Badge>
                  </div>
                )}
              </div>
              {/* Update Settings */}
              <Card className="border-none shadow-none p-0">
                {/* <CardHeader className="pb-3">
                  <CardTitle className="text-balance">
                    Update Settings
                  </CardTitle>
                  <CardDescription className="text-pretty">
                    Automatically download and install updates when available
                  </CardDescription>
                </CardHeader> */}
                <CardContent className="space-y-3 py-0 pt-6">
                  <div className="flex flex-row gap-3 items-center p-0">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enableAutoUpdate"
                        checked={values.enableAutoUpdate}
                        onCheckedChange={(checked) =>
                          setFieldValue("enableAutoUpdate", Boolean(checked))
                        }
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="enableAutoUpdate">
                        Enable Auto-Update
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      // size="icon"
                      disabled={isSubmitting || updating}
                      variant="primary"
                      className="h-[24px] text-xs"
                    >
                      {isSubmitting ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                  {/* <div className="space-y-1.5 pt-0 ml-8">
                    <p className="text-sm text-muted-foreground">
                      Automatically download and install updates when available.
                    </p>
                  </div> */}
                  {/* <ErrorMessage
                    name="enableAutoUpdate"
                    component="div"
                    className="text-sm text-destructive"
                  /> */}
                  {/* <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto"> */}
                  {/* <Button
                      type="button"
                      variant="outline"
                      onClick={() => onClose()}
                      disabled={isSubmitting || updating}
                    >
                      Close
                    </Button> */}
                  {/* <Button
                      type="submit"
                      disabled={isSubmitting || updating}
                      variant="primary"
                    >
                      {isSubmitting ? "Saving..." : "Save Settings"}
                    </Button> */}
                  {/* </div> */}
                </CardContent>
              </Card>
              {/* Check for Updates */}
              <Card className="border-none shadow-none p-0 ">
                {/* <CardHeader className="pb-3">
                  <CardTitle className="text-balance">
                    Check for Updates
                  </CardTitle>
                  <CardDescription className="text-pretty">
                    Manually check for available updates
                  </CardDescription>
                </CardHeader> */}
                <CardContent className="space-y-4 pt-6">
                  {!updateAvailable && (
                    <div className="flex justify-end w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCheckForUpdates}
                        disabled={checkingUpdates}
                        className="bg-transparent"
                      >
                        {checkingUpdates ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking for updates...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Check for updates
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Keep concise status messages */}
                  {/* {updateAvailable && (
                    <Alert
                      variant={updateAvailable ? "destructive" : "default"}
                      className="border-dashed"
                    >
                      <div className="flex items-start gap-3">
                        {updateAvailable ? (
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <AlertTitle className="text-sm">
                            {updateAvailable
                              ? "Update available"
                              : "You’re up to date"}
                          </AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground">
                            Current:{" "}
                            <Badge variant="secondary">{currentVersion}</Badge>
                            <span className="px-2 text-muted-foreground">
                              •
                            </span>
                            Latest:{" "}
                            <Badge
                              variant={
                                updateAvailable ? "destructive" : "default"
                              }
                            >
                              {latestVersion}
                            </Badge>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )} */}
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
                <Card className="border-none shadow-none p-0">
                  <CardHeader className="pb-3 pt-0">
                    <CardTitle className="text-balance">What's New</CardTitle>
                    <CardDescription className="text-pretty">
                      Changes from version {currentVersion} to {latestVersion}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-6">
                      {changelogVersions
                        .sort(
                          (a, b) =>
                            new Date(b.publishedAt).getTime() -
                            new Date(a.publishedAt).getTime()
                        )
                        .map((version) => (
                          <div key={version.version} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {version.version}
                                </Badge>
                                {version.isPrerelease && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
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
                            <div className="rounded-md border bg-muted/30 p-3 text-sm">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h3
                                      className="text-base font-semibold"
                                      {...props}
                                    />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h4
                                      className="text-sm font-semibold"
                                      {...props}
                                    />
                                  ),
                                  p: (props) => (
                                    <p
                                      className="leading-relaxed mb-2 last:mb-0"
                                      {...props}
                                    />
                                  ),
                                  ul: (props) => (
                                    <ul
                                      className="list-disc pl-5 space-y-1"
                                      {...props}
                                    />
                                  ),
                                  ol: (props) => (
                                    <ol
                                      className="list-decimal pl-5 space-y-1"
                                      {...props}
                                    />
                                  ),
                                  code: ({ className, children, ...props }) => (
                                    <code
                                      className="block overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.85em]"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  ),
                                  a: (props) => (
                                    <a
                                      className="underline hover:no-underline"
                                      target="_blank"
                                      rel="noreferrer"
                                      {...props}
                                    />
                                  ),
                                  table: (props) => (
                                    <div className="overflow-x-auto">
                                      <table
                                        className="w-full text-sm"
                                        {...props}
                                      />
                                    </div>
                                  ),
                                  th: (props) => (
                                    <th
                                      className="border-b px-2 py-1 text-left font-medium"
                                      {...props}
                                    />
                                  ),
                                  td: (props) => (
                                    <td
                                      className="border-b px-2 py-1 align-top"
                                      {...props}
                                    />
                                  ),
                                }}
                              >
                                {version.releaseNotes}
                              </ReactMarkdown>
                            </div>
                            {version !==
                              changelogVersions[
                                changelogVersions.length - 1
                              ] && <Separator className="my-3" />}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* {updateAvailable && (
                <div className="bottom-0 left-0 w-full h-[20px]"></div>
              )} */}
              {/* Update Button */}
              {updateAvailable && (
                // <Card>
                // <CardContent className="pt-6">
                <Button
                  type="button"
                  onClick={handleUpdate}
                  disabled={updating}
                  style={{
                    backgroundColor: "var(--portal-primary)",
                    // color: "var(--portal-secondary)",
                  }}
                  className="w-full absolute bottom-0 left-0"
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
                      Update now
                    </>
                  )}
                </Button>
                // </CardContent>
                // </Card>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
