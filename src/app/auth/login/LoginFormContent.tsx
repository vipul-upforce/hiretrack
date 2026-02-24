'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cx } from '@/lib/cx';
import packageJson from '@/../package.json';
import LoadingScreen from '@/app/loading-screen';

// Hooks
import { useHandleLoginSubmit } from '@/app/auth/hooks/useLoginSubmit';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import OrganizationDialog from '@/components/auth/OrganizationDialog';
// import { getBetaFlag } from '@/lib/configUtils';
import { usePortalBranding } from './hooks/use-portal-branding';
import { useCaptchaHandler } from './hooks/use-captcha-handler';

// Components
import {
  AnimatedGridPattern,
  FlickeringGrid,
} from './components/animated-background';
import { BrandingSection } from './components/branding-section';
import { LoginForm } from './components/login-form';

// Types & Schemas
import { LoginSchemaType } from './schemas/login-schema';
import { LoginFormValues, OneOfMulOrganization } from './types';

interface LoginFormContentProps {
  showCompanyField?: boolean;
}

export default function LoginFormContent({
  showCompanyField = false,
}: LoginFormContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = searchParams?.get('redirect');

  const showCandidateSignup = redirectPath
    ? redirectPath.includes('candidate')
    : false;

  // Local State
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OneOfMulOrganization[]>(
    [],
  );
  // const [isBeta, setIsBeta] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>();
  const [loginValues, setLoginValues] = useState<LoginFormValues>();
  const [isMultipleOrgs, setIsMultipleOrgs] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLoginSuccess = useCallback(() => {
    setIsSuccess(true);
  }, []);

  // Custom Hooks
  const { branding, isLoading: isPortalLoading } = usePortalBranding();
  const {
    isEnabled: isCaptchaEnabled,
    captchaType,
    captchaVariant,
    siteKey: captchaSiteKey,
    captchaToken,
    setCaptchaToken,
    isLoading: isCaptchaLoading,
  } = useCaptchaHandler();

  const { handleSubmit, isLoading: isAuthLoading } = useHandleLoginSubmit({
    selectedOrg: selectedOrgId,
    isMultiple: isMultipleOrgs,
    setOrganizations,
    setOrganizationDialogOpen,
    setLoginFormValues: setLoginValues,
    onLoginSuccess: handleLoginSuccess,
  });

  // const getBetaFlagVal = async () => {
  //   const betaFlag: boolean = await getBetaFlag();
  //   setIsBeta(betaFlag);
  // };

  // useEffect(() => {
  //   getBetaFlagVal();
  // }, []);

  // Redirecting indicator is shown only after successful login and auto-resets in 10s.
  useEffect(() => {
    if (!isSuccess) return undefined;
    const timeoutId = setTimeout(() => {
      setIsSuccess(false);
    }, 10000);
    return () => clearTimeout(timeoutId);
  }, [isSuccess]);

  // Determine multiple orgs
  useEffect(() => {
    if (organizations.length > 1) setIsMultipleOrgs(true);
  }, [organizations]);

  // Handle Org selection
  useEffect(() => {

    if (selectedOrgId && loginValues?.email) {
      // Trigger submission again when org is selected
      handleSubmit(
        { email: loginValues.email, password: loginValues.password },
        () => { },
        { setStatus: () => { } },
      );
    }
  }, [selectedOrgId]);

  const onFormSubmit = async (
    data: LoginSchemaType,
    setSubmitting: (isSubmitting: boolean) => void,
  ): Promise<void> => {
    setIsSuccess(false);
    setLoginValues(data);
    await handleSubmit(
      { email: data.email, password: data.password },
      setSubmitting,
      { setStatus: () => { } },
    );
  };

  const isLoadingGlobal = isPortalLoading || isCaptchaLoading;

  if (isLoadingGlobal) return <LoadingScreen />;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4">
      {/* Background Layer */}
      <div className="absolute inset-0">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.1}
          duration={3}
          className={cx(
            '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[-30%] h-[200%] skew-y-12',
          )}
        />
        <FlickeringGrid
          className="absolute inset-0 size-full opacity-50"
          squareSize={4}
          gridGap={6}
          color={branding.primaryColor}
          maxOpacity={0.3}
          flickerChance={0.1}
        />
      </div>

      {/* Decorative Orbs */}
      <div
        className="absolute left-1/4 top-1/4 h-72 w-72 animate-pulse rounded-full blur-3xl"
        style={{
          background: `linear-gradient(135deg, ${branding.primaryColor}20, ${branding.secondaryColor}20)`,
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl delay-1000"
        style={{
          background: `linear-gradient(225deg, ${branding.secondaryColor}15, ${branding.primaryColor}15)`,
        }}
      />

      {/* Theme Toggle */}
      <div className="absolute right-4 top-4 z-[999]">
        <ThemeToggle
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-border bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background/90"
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto w-full max-w-6xl items-center gap-8 lg:grid lg:grid-cols-2">
        <BrandingSection branding={branding} />

        <LoginForm
          branding={branding}
          onSubmit={onFormSubmit}
          isLoading={isAuthLoading}
          isSuccess={isSuccess}
          showCompanyField={showCompanyField}
          captchaEnabled={isCaptchaEnabled}
          captchaType={captchaType}
          captchaVariant={captchaVariant}
          captchaSiteKey={captchaSiteKey}
          captchaToken={captchaToken}
          onCaptchaChange={setCaptchaToken}
          onForgotPassword={() => setForgotPasswordOpen(true)}
          onOrgClick={() => {
            setSelectedOrgId(undefined);
            setOrganizationDialogOpen(true);
          }}
          selectedOrgId={selectedOrgId}
          organizations={organizations}
          showCandidateSignup={showCandidateSignup}
          onSignupClick={() => router.push('/signup')}
        />
      </div>

      {/* Dialogs */}
      <ForgotPasswordDialog
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />

      {loginValues && !selectedOrgId && (
        <OrganizationDialog
          isOpen={organizationDialogOpen}
          onClose={() => setOrganizationDialogOpen(false)}
          data={{ ...loginValues, organizations }}
          setSelectedOrgId={setSelectedOrgId}
        />
      )}

      {/* Footer */}
      <div
        className="pointer-events-none fixed bottom-2 right-4 z-50 select-none text-xs text-gray-400"
        aria-label="App Version"
      >
        v{packageJson.version}
      </div>
    </div>
  );
}
