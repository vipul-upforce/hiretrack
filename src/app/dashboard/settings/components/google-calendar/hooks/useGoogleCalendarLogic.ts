import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetGoogleCalendarConfigQuery,
  useUpdateGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
} from "@/lib/features/settings/settingsApi";
import { CredentialsFormData, TestResult } from "../types";

export function useGoogleCalendarLogic() {
  const { toast } = useToast();

  const { data, isLoading, refetch } =
    useGetGoogleCalendarConfigQuery(undefined);
  const [updateGoogleCalendar, { isLoading: isUpdating }] =
    useUpdateGoogleCalendarMutation();
  const [disconnectGoogleCalendar, { isLoading: isDisconnecting }] =
    useDisconnectGoogleCalendarMutation();

  const [showConfetti, setShowConfetti] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [_authWindow, setAuthWindow] = useState<Window | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [formData, setFormData] = useState<CredentialsFormData>({
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "google-calendar-connected") {
        setShowConfetti(true);
        setAuthWindow(null);
        refetch();
        toast({
          title: "Success!",
          description: "Google Calendar connected successfully",
        });
        setTimeout(() => setShowConfetti(false), 5000);
      }

      if (event.data.type === "google-calendar-error") {
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

  // Handlers
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

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setTimeout(() => {
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
        headers: { "Content-Type": "application/json" },
      });

      let data;
      let responseText = "";

      try {
        responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = {
          success: false,
          error: `Invalid JSON response`,
          details: `Status: ${response.status} ${response.statusText}`,
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

        if (data.connectionStatusUpdated) {
          setTimeout(() => refetch(), 1000);
        }
      }
    } catch (networkError: any) {
      const errorDetails =
        networkError instanceof Error
          ? networkError.message
          : String(networkError);
      setTestResult({
        success: false,
        message: "Network connection failed",
        details: errorDetails,
      });
      toast({
        title: "Connection Test Error",
        description: errorDetails,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return {
    isLoading,
    isUpdating,
    isDisconnecting,
    isTestingConnection,
    showConfetti,
    redirectUri,
    testResult,
    formData,
    data,
    setFormData,
    setShowConfetti,
    handleSaveCredentials,
    handleConnect,
    handleDisconnect,
    handleTestConnection,
  };
}
