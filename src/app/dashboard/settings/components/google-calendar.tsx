"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Check,
  X,
  Copy,
  Info,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  LogOut,
  Sparkles,
  Shield,
} from "lucide-react";
import {
  useGetGoogleCalendarConfigQuery,
  useUpdateGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
} from "@/lib/features/settings/settingsApi";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/use-window-size";

export default function GoogleCalendarSettings({
  onClose,
}: {
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { width, height } = useWindowSize();
  const { data, isLoading, refetch } =
    useGetGoogleCalendarConfigQuery(undefined);
  const [updateGoogleCalendar, { isLoading: isUpdating }] =
    useUpdateGoogleCalendarMutation();
  const [disconnectGoogleCalendar, { isLoading: isDisconnecting }] =
    useDisconnectGoogleCalendarMutation();

  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    data?: any;
  } | null>(null);

  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      setRedirectUri(`${baseUrl}/api/auth/google/callback`);
    }
  }, []);

  useEffect(() => {
    if (data?.googleCalendar) {
      setFormData({
        clientId: data.googleCalendar.clientId || "",
        clientSecret: data.googleCalendar.clientSecret || "",
      });
    }
  }, [data]);

  // Listen for successful connection from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("Received message:", event.data); // Debug log
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "google-calendar-connected") {
        console.log("Google Calendar connected, refetching..."); // Debug log
        setShowConfetti(true);
        setAuthWindow(null); // Clear auth window reference
        refetch();
        toast({
          title: "Success!",
          description: "Google Calendar connected successfully",
        });

        // Stop confetti after 5 seconds
        setTimeout(() => setShowConfetti(false), 5000);
      }

      if (event.data.type === "google-calendar-error") {
        console.error("Google Calendar error:", event.data.error); // Debug log
        toast({
          title: "Error",
          description: event.data.error || "Failed to connect Google Calendar",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refetch, toast]);

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    toast({
      title: "Copied!",
      description: "Redirect URI copied to clipboard",
    });
  };

  const handleSaveCredentials = async () => {
    try {
      await updateGoogleCalendar({
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      }).unwrap();

      toast({
        title: "Success",
        description: "Google Calendar credentials saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save credentials",
        variant: "destructive",
      });
    }
  };

  const handleConnect = () => {
    const authUrl = `/api/auth/google/authorize`;
    const authWindowFeatures = "width=600,height=700,left=100,top=100";
    const popup = window.open(
      authUrl,
      "GoogleCalendarAuth",
      authWindowFeatures
    );
    setAuthWindow(popup);

    // Fallback: Check if popup was closed manually and refetch
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        // Wait a bit and refetch to check if connection was successful
        setTimeout(() => {
          console.log("Popup closed, refetching status..."); // Debug log
          refetch();
        }, 1000);
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleCalendar({}).unwrap();
      toast({
        title: "Disconnected",
        description: "Google Calendar disconnected successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/google-calendar/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Always try to parse the response, even if it failed
      let data;
      let responseText = "";

      try {
        responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        // If we can't parse JSON, show the raw response
        data = {
          success: false,
          error: `Invalid JSON response`,
          details: `Status: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 500)}${responseText.length > 500 ? "..." : ""}`,
          rawResponse: responseText,
        };
      }

      setTestResult({
        success: data.success || false,
        message: data.message || data.error || `HTTP ${response.status}`,
        details:
          data.details ||
          (response.ok
            ? undefined
            : `Server returned ${response.status}: ${response.statusText}`),
        data: {
          ...data.data,
          debugInfo: data.debugInfo,
          rawResponse:
            data.rawResponse ||
            (!data.success && responseText ? responseText : undefined),
          connectionStatusUpdated: data.connectionStatusUpdated,
        },
      });

      if (data.success) {
        toast({
          title: "Connection Test Passed ✅",
          description: data.message || "Google Calendar connection is working",
        });
      } else {
        toast({
          title: "Connection Test Failed ❌",
          description:
            data.details ||
            data.error ||
            `HTTP ${response.status}: ${response.statusText}`,
          variant: "destructive",
        });

        // If the connection status was updated (marked as disconnected), refresh the UI
        if (data.connectionStatusUpdated) {
          console.log("🔄 Connection status was updated, refreshing...");
          setTimeout(() => {
            refetch(); // Refresh the settings data to show updated connection status
          }, 1000); // Small delay to ensure database update is complete
        }
      }
    } catch (networkError) {
      console.error("Network error during connection test:", networkError);

      let errorMessage = "Network connection failed";
      let errorDetails = "Unable to reach the server";

      if (networkError instanceof TypeError) {
        if (networkError.message.includes("Failed to fetch")) {
          errorDetails =
            "Network request failed. Check your internet connection or server status.";
        } else {
          errorDetails = `Network error: ${networkError.message}`;
        }
      } else if (networkError instanceof Error) {
        errorDetails = `Error: ${networkError.message}`;
      } else {
        errorDetails = `Unexpected error: ${String(networkError)}`;
      }

      const errorResult = {
        success: false,
        message: errorMessage,
        details: errorDetails,
      };

      setTestResult(errorResult);
      toast({
        title: "Connection Test Error",
        description: errorDetails,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isConfigured = formData.clientId && formData.clientSecret;
  const isConnected = data?.googleCalendar?.isConnected;

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} />}

      <div className="space-y-6">
        {/* Setup Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Setup Instructions</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>To enable Google Calendar integration:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Go to{" "}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  Google Cloud Console <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Create a new project or select existing one</li>
              <li>
                <strong>Enable Google Calendar API</strong> in API Library
              </li>
              <li>
                Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
              </li>
              <li>Set Application Type to "Web application"</li>
              <li>
                <strong>Add the exact redirect URI shown below</strong>
              </li>
              <li>Copy Client ID and Client Secret here</li>
              <li>Save credentials and try connecting</li>
            </ol>
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-800/50 rounded text-sm space-y-2">
              <div>
                <strong className="dark:text-amber-200 ">
                  ⚠️ Critical Requirements:
                </strong>
              </div>
              <ul className="list-disc list-inside space-y-1 ml-2 dark:text-amber-300">
                <li>
                  <strong>Enable Google Calendar API</strong> in API Library
                </li>
                <li>
                  <strong>Set OAuth consent screen</strong> to External (unless
                  internal org)
                </li>
                <li>
                  <strong>Add test users</strong> if using external consent
                  screen
                </li>
                <li>
                  <strong>Copy redirect URI exactly</strong> (no extra
                  spaces/characters)
                </li>
                <li>
                  <strong>Ensure scopes include:</strong> Calendar, Calendar
                  Events, Email
                </li>
              </ul>
              <div className="text-red-600 font-medium">
                💡 If you get "missing authentication credential" errors, it
                usually means the Calendar API is not enabled!
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Redirect URI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Redirect URI</CardTitle>
            <CardDescription>
              Add this exact URI to your Google OAuth2 credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={redirectUri}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyRedirectUri}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">OAuth2 Credentials</CardTitle>
            <CardDescription>
              Enter your Google OAuth2 credentials from Google Cloud Console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={formData.clientId}
                onChange={(e) =>
                  setFormData({ ...formData, clientId: e.target.value })
                }
                placeholder="Enter Google OAuth2 Client ID"
                disabled={isConnected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="clientSecret"
                  type={showClientSecret ? "text" : "password"}
                  value={formData.clientSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, clientSecret: e.target.value })
                  }
                  placeholder="Enter Google OAuth2 Client Secret"
                  disabled={isConnected}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  disabled={isConnected}
                >
                  {showClientSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!isConnected && (
              <Button
                onClick={handleSaveCredentials}
                disabled={
                  !formData.clientId || !formData.clientSecret || isUpdating
                }
                className="w-full"
              >
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Credentials
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Connection Status
              {isConnected ? (
                <Badge
                  variant="default"
                  className="flex items-center gap-1 bg-green-500 text-white hover:bg-green-600"
                >
                  <Check className="h-3 w-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <X className="h-3 w-3" /> Not Connected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected && data?.googleCalendar?.connectedEmail && (
              <div className="space-y-2">
                <Label>Connected Account</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {data.googleCalendar.connectedEmail}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={!isConfigured}
                  className="flex-1"
                  variant="default"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Connect Google Calendar
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    variant="outline"
                    className="flex-1"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    variant="outline"
                    className="flex-1"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResult && (
          <Alert
            className={
              testResult.success
                ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                : "border-red-200 bg-red-50 dark:bg-red-950/20"
            }
          >
            {testResult.success ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle
              className={
                testResult.success
                  ? "text-green-800 dark:text-green-300"
                  : "text-red-800 dark:text-red-300"
              }
            >
              Connection Test {testResult.success ? "Passed" : "Failed"}
            </AlertTitle>
            <AlertDescription
              className={
                testResult.success
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }
            >
              <div className="space-y-2">
                <p>{testResult.message}</p>
                {testResult.data?.connectionStatusUpdated && (
                  <div className="text-sm font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                    ⚠️ Connection status updated: Marked as disconnected due to
                    authentication failure
                  </div>
                )}
                {testResult.details && (
                  <div className="text-sm opacity-90">
                    <p className="font-medium mb-1">Details:</p>
                    <div className="font-mono text-xs bg-black/5 dark:bg-white/5 p-2 rounded border">
                      {testResult.details}
                    </div>
                  </div>
                )}
                {testResult.success && testResult.data && (
                  <div className="text-xs opacity-80 space-y-1 mt-2 p-2 bg-white/50 dark:bg-black/20 rounded border">
                    <div>
                      <strong>Connected Account:</strong>{" "}
                      {testResult.data.connectedEmail}
                    </div>
                    <div>
                      <strong>Primary Calendar:</strong>{" "}
                      {testResult.data.primaryCalendarName}
                    </div>
                    <div>
                      <strong>Time Zone:</strong>{" "}
                      {testResult.data.primaryCalendarTimeZone}
                    </div>
                    <div>
                      <strong>Accessible Calendars:</strong>{" "}
                      {testResult.data.calendarCount}
                    </div>
                    <div>
                      <strong>Last Tested:</strong>{" "}
                      {new Date(testResult.data.lastTestedAt).toLocaleString()}
                    </div>
                  </div>
                )}
                {!testResult.success && testResult.data?.rawResponse && (
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer font-medium opacity-80 hover:opacity-100">
                      Show Raw Server Response
                    </summary>
                    <div className="mt-1 font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded border max-h-40 overflow-auto">
                      {testResult.data.rawResponse}
                    </div>
                  </details>
                )}
                {!testResult.success && testResult.data?.debugInfo && (
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer font-medium opacity-80 hover:opacity-100">
                      Show Debug Information
                    </summary>
                    <div className="mt-1 font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded border max-h-40 overflow-auto">
                      <pre>
                        {JSON.stringify(testResult.data.debugInfo, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message with Confetti Icon */}
        {isConnected && !testResult && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-300">
              Google Calendar Connected!
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              You can now schedule Google Meet interviews directly from the
              candidate assignment dialog. Use the "Test Connection" button to
              verify everything is working properly.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="flex justify-end gap-2 pb-5">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
