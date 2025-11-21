"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { useCandidateSignupMutation } from "@/lib/features/candidate/candidateApi";
import { useGetCaptchaConfigsQuery } from "@/lib/features/settings/settingsApi";
import { getDecodedCaptcha } from "@/hooks/useSSE";
import { SignupFormValues, PortalSettings } from "../types";

export const useSignupLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [signup, { isLoading: isSignupLoading }] = useCandidateSignupMutation();
  const { data: captchaConfig } = useGetCaptchaConfigsQuery(undefined);

  const [orgName, setOrgName] = useState<string | undefined>();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>({
    portalLogo: null,
    portalLogoDark: null,
    portalFavicon: null,
    portalName: "",
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    isLoading: true,
    hasError: false,
  });

  // 1. Organization Check
  useEffect(() => {
    async function checkAllowance() {
      try {
        const data = await fetch("/api/organization");
        const allowance = await data.json();
        setOrganizationId(allowance.data?.[0]?.organizationId);

        if (!data.ok && !allowance.allow) {
          router.push("/signup");
        }
      } catch (e) {
        console.error("Org check failed", e);
      }
    }
    checkAllowance();
  }, [router]);

  // 2. Org Name from Params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const orgNameFromQuery = searchParams?.get("o");
      if (orgNameFromQuery) {
        setOrgName(decodeURIComponent(orgNameFromQuery));
      }
    }
  }, [searchParams]);

  // 3. Decrypt Captcha
  useEffect(() => {
    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          organizationId
        );
        if (decrypted) setDecryptedSiteKey(decrypted);
      }
    };
    decryptSiteKey();
  }, [captchaConfig, organizationId]);

  // 4. Fetch Portal Settings
  useEffect(() => {
    async function fetchPortalSettings() {
      try {
        const response = await fetch("/api/settings/portal");
        if (response.ok) {
          const data = await response.json();

          setPortalSettings((prev) => ({
            ...prev,
            portalLogo: data.portalLogo?.url || null,
            portalLogoDark: data.portalLogoDark?.url || null,
            portalFavicon: data.portalFavicon?.url || null,
            portalName: data.portalName || "",
            primaryColor: data.primaryColor || prev.primaryColor,
            secondaryColor: data.secondaryColor || prev.secondaryColor,
            isLoading: false,
          }));

          // Set Favicon
          if (data.portalFavicon?.url) {
            const favicon = document.querySelector(
              "link[rel*='icon']"
            ) as HTMLLinkElement;
            if (favicon) favicon.href = data.portalFavicon.url;
            else {
              const newFavicon = document.createElement("link");
              newFavicon.rel = "icon";
              newFavicon.href = data.portalFavicon.url;
              document.head.appendChild(newFavicon);
            }
          }

          // Set Title
          document.title = data.portalName
            ? `Sign Up - ${data.portalName}`
            : "Sign Up - HireTrack";
        } else {
          setPortalSettings((prev) => ({
            ...prev,
            isLoading: false,
            hasError: true,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch portal settings:", error);
        setPortalSettings((prev) => ({
          ...prev,
          isLoading: false,
          hasError: true,
        }));
      }
    }
    fetchPortalSettings();
  }, []);

  // 5. CSS Variables for Colors
  useEffect(() => {
    if (!portalSettings.isLoading && !portalSettings.hasError) {
      document.documentElement.style.setProperty(
        "--portal-primary",
        portalSettings.primaryColor
      );
      document.documentElement.style.setProperty(
        "--portal-secondary",
        portalSettings.secondaryColor
      );
    }
  }, [portalSettings]);

  // Helper: Get Logo URL
  const getLogoUrl = () => {
    if (
      portalSettings.hasError ||
      (!portalSettings.isLoading &&
        !portalSettings.portalLogo &&
        !portalSettings.portalLogoDark)
    ) {
      return theme === "dark" ? "/logo_dark.png" : "/logo.png";
    }
    if (theme === "dark" && portalSettings.portalLogoDark)
      return portalSettings.portalLogoDark;
    if (portalSettings.portalLogo) return portalSettings.portalLogo;
    return "";
  };

  // Handler: Submit
  const handleSignupSubmit = async (
    values: SignupFormValues,
    { setStatus }: { setStatus: (message: string) => void }
  ) => {
    try {
      const signupData = {
        ...values,
        email: values.email.toLowerCase().trim(),
        name: values.name.trim(),
        ...(orgName && { orgName: orgName }),
      };

      const response = await signup(signupData).unwrap();

      if (response.user) {
        toast({
          title: "Success",
          description: "Account created successfully",
          variant: "default",
        });
        router.push("/auth/login");
      } else {
        throw new Error("No user data received");
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to create account";
      if (error && typeof error === "object" && "data" in error) {
        errorMessage =
          (error.data as { error: string }).error ||
          "Failed to parse user data";
      }
      setStatus(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return {
    theme,
    portalSettings,
    orgName,
    decryptedSiteKey,
    captchaConfig,
    showTermsDialog,
    setShowTermsDialog,
    isSignupLoading,
    getLogoUrl,
    handleSignupSubmit,
  };
};
