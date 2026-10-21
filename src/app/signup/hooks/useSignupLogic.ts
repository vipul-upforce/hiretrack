'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme-provider';
import { useCandidateSignupMutation } from '@/lib/features/candidate/candidateApi';
import {
  useGetCaptchaConfigsQuery,
  useGetPortalConfigsQuery,
} from '@/lib/features/settings';
import { useGetOrganizationAllowanceQuery } from '@/lib/features/org/orgApi';
import { getDecodedCaptcha } from '@/hooks/useSSE';
import { SignupFormValues, PortalSettings } from '../types';

export const useSignupLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [signup, { isLoading: isSignupLoading }] = useCandidateSignupMutation();
  const { data: captchaConfig } = useGetCaptchaConfigsQuery(undefined);

  const { data: allowanceData } = useGetOrganizationAllowanceQuery({
    limit: 1,
  });

  const {
    data: apiPortalSettings,
    isLoading: isPortalLoading,
    isError: isPortalError,
  } = useGetPortalConfigsQuery(undefined);

  const [orgName, setOrgName] = useState<string | undefined>();
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const organizationId = allowanceData?.data?.[0]?.organizationId || null;

  // 1. Organization Check
  useEffect(() => {
    if (allowanceData && !allowanceData.allow) {
      router.push('/signup');
    }
  }, [allowanceData, router]);

  // 2. Org Name from Params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const orgNameFromQuery = searchParams?.get('o');
      if (orgNameFromQuery) {
        setOrgName(decodeURIComponent(orgNameFromQuery));
      }
    }
  }, [searchParams]);

  // 3. Decrypt Captcha
  useEffect(() => {
    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey && organizationId) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          organizationId,
        );
        if (decrypted) setDecryptedSiteKey(decrypted);
      }
    };
    decryptSiteKey();
  }, [captchaConfig, organizationId]);

  // 4. Handle Portal Settings
  useEffect(() => {
    if (apiPortalSettings) {
      // Set Favicon
      if (apiPortalSettings.portalFavicon?.url) {
        const favicon = document.querySelector(
          "link[rel*='icon']",
        ) as HTMLLinkElement;
        if (favicon) {
          favicon.href = apiPortalSettings.portalFavicon.url;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = apiPortalSettings.portalFavicon.url;
          document.head.appendChild(newFavicon);
        }
      }

      // Set Title
      document.title = apiPortalSettings.portalName
        ? `Sign Up - ${apiPortalSettings.portalName}`
        : 'Sign Up - HireTrack';

      // Set CSS Variables
      if (apiPortalSettings.primaryColor) {
        document.documentElement.style.setProperty(
          '--portal-primary',
          apiPortalSettings.primaryColor,
        );
      }
      if (apiPortalSettings.secondaryColor) {
        document.documentElement.style.setProperty(
          '--portal-secondary',
          apiPortalSettings.secondaryColor,
        );
      }
    }
  }, [apiPortalSettings]);

  // 5. Construct Portal Settings Object for UI
  const portalSettings: PortalSettings = useMemo(
    () => ({
      portalLogo: apiPortalSettings?.portalLogo?.url || null,
      portalLogoDark: apiPortalSettings?.portalLogoDark?.url || null,
      portalFavicon: apiPortalSettings?.portalFavicon?.url || null,
      portalName: apiPortalSettings?.portalName || '',
      primaryColor: apiPortalSettings?.primaryColor || '#6366f1',
      secondaryColor: apiPortalSettings?.secondaryColor || '#8b5cf6',
      isLoading: isPortalLoading,
      hasError: isPortalError,
    }),
    [apiPortalSettings, isPortalLoading, isPortalError],
  );

  // Helper: Get Logo URL
  const getLogoUrl = () => {
    if (
      portalSettings.hasError ||
      (!portalSettings.isLoading &&
        !portalSettings.portalLogo &&
        !portalSettings.portalLogoDark)
    ) {
      return theme === 'dark' ? '/logo_dark.png' : '/logo.png';
    }
    if (theme === 'dark' && portalSettings.portalLogoDark)
      return portalSettings.portalLogoDark;
    if (portalSettings.portalLogo) return portalSettings.portalLogo;
    return '';
  };

  // Handler: Submit
  const handleSignupSubmit = async (
    values: SignupFormValues,
    { setStatus }: { setStatus: (message: string) => void },
  ) => {
    try {
      const signupData = {
        ...values,
        email: values.email.toLowerCase().trim(),
        name: values.name.trim(),
        ...(orgName && { orgName }),
      };

      const response = await signup(signupData).unwrap();

      if (response.user) {
        toast({
          title: 'Success',
          description: 'Account created successfully',
          variant: 'default',
        });
        router.push('/auth/login');
      } else {
        throw new Error('No user data received');
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to create account';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'data' in error
      ) {
        const errorWithData = error as { data: unknown };

        if (
          typeof errorWithData.data === 'object' &&
          errorWithData.data !== null
        ) {
          const dataObj = errorWithData.data as {
            error?: string;
            message?: string;
          };
          errorMessage = dataObj.error || dataObj.message || errorMessage;
        }
      }

      setStatus(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return {
    theme,
    portalSettings,
    orgName,
    decryptedSiteKey,
    captchaType:
      (captchaConfig?.captcha?.captchaType as 'v2' | 'v3') || 'v2',
    captchaVariant:
      (captchaConfig?.captcha?.captchaVariant as 'checkbox' | 'invisible') ||
      'checkbox',
    captchaConfig,
    showTermsDialog,
    setShowTermsDialog,
    isSignupLoading,
    getLogoUrl,
    handleSignupSubmit,
  };
};
