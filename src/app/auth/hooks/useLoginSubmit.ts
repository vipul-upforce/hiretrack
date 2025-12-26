'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  useLoginMutation,
  useSendOtpMutation,
  useLazyValidateLicenseQuery,
} from '@/lib/features/auth/authApi';
import { useCustomFields } from '@/Custom_Fields/hooks/use-customFields';

import { LoginFormValues } from '@/types/login';
import { useCallback } from 'react';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { useDispatch } from 'react-redux';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { AppDispatch } from '@/lib/redux/store';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';

interface HandleLoginSubmitProps {
  selectedOrg?: string;
  isMultiple: boolean;
  setOrganizations: (organizations: OneOfMulOrganization[]) => void;
  setOrganizationDialogOpen: (open: boolean) => void;
  setLoginFormValues: (values: LoginFormValues) => void;
}

export const useHandleLoginSubmit = ({
  selectedOrg,
  isMultiple,
  setOrganizations,
  setOrganizationDialogOpen,
  setLoginFormValues,
}: HandleLoginSubmitProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [triggerLicenseCheck, { isLoading: isCheckingLicense }] =
    useLazyValidateLicenseQuery();

  const { setUserLoggedIn } = useCustomFields();
  const dispatch = useDispatch<AppDispatch>();

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const getRedirectUrl = () => {
    const redirectTo =
      searchParams?.get('redirect') || searchParams?.get('returnUrl');

    if (redirectTo) {
      try {
        const decodedUrl = decodeURIComponent(redirectTo);
        if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
          return decodedUrl;
        }
      } catch (error) {
        logger.warn('Invalid redirect URL:', redirectTo, error);
      }
    }

    if (user?.role === 'candidate') {
      return isMultiple
        ? `/apply-jobs?o=${user.organizationInfo?.name}`
        : '/apply-jobs';
    }
    if (
      user?.role === 'admin' ||
      user?.role === 'interviewer' ||
      user?.role === 'hr'
    ) {
      return '/dashboard';
    }

    return '/';
  };

  const handleSubmit = useCallback(
    async (
      values: LoginFormValues,
      setIsSubmitting: (isSubmitting: boolean) => void,
      { setStatus }: { setStatus: (message: string) => void },
    ) => {
      setLoginFormValues(values);

      // firstly check the license
      try {
        const data = await triggerLicenseCheck().unwrap();

        if (!data.valid) {
          throw new Error(data.error || 'License validation failed');
        }

        setIsSubmitting(false);
      } catch (e: unknown) {
        // Handle license check failure
        let errorMessage =
          'License not verified. Please contact support or try re-installing the platform.';

        if (e && typeof e === 'object' && 'data' in e) {
          const errorData = e as { data?: { message?: string } };
          errorMessage = errorData.data?.message || 'License check failed';
        } else if (e instanceof Error) {
          errorMessage = e.message;
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Login
      try {
        const response = await login({
          ...values,
          email: values.email.toLowerCase().trim(),
          orgId: selectedOrg,
        }).unwrap();

        // Handle Multiple Organizations
        if (
          response.organizations &&
          response.organizations.length > 1 &&
          !selectedOrg
        ) {
          setOrganizations(response.organizations);
          setOrganizationDialogOpen(true);
          return;
        }

        // Handle 2FA
        const is2FAEnabled = response.twofa;
        if (is2FAEnabled) {
          const { organizationId } = response;
          try {
            await sendOtp({
              email: values.email.toLowerCase().trim(),
              organizationId,
              isCandidate: response.isCandidate,
            }).unwrap();

            toast({
              title: 'Check your email',
              description: 'An OTP has been sent to your email address.',
              variant: 'default',
            });
            router.push(
              `/auth/2fa/verify?email=${values.email.toLowerCase().trim()}&orgId=${organizationId}${response.isCandidate ? '&isCandidate=true' : ''}`,
            );
          } catch (error) {
            logger.error(error);
            const errorMessage =
              (error as { data?: { message: string } })?.data?.message ||
              (error instanceof Error ? error.message : 'Failed to send OTP');

            setStatus(errorMessage);
            toast({
              title: 'Error',
              description: errorMessage,
              variant: 'destructive',
            });
          }
          return;
        }
        // Handle Redirects & Redux State
        const redirectUrl = getRedirectUrl();      
        dispatch(fetchUserFromToken());
        if (isAuthenticated) {
          if (redirectUrl !== '/') {
            router.push(redirectUrl);
          }
          setUserLoggedIn(true);
          toast({
            title: 'Success',
            description: 'Login successful',
            variant: 'default',
          });
        }

      } catch (err: unknown) {
        logger.error(err);
        const errorMessage =
          err &&
          typeof err === 'object' &&
          'data' in err &&
          (err.data as { error: string }).error
            ? (err.data as { error: string }).error
            : 'An unknown error occurred';
        setStatus(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [
      login,
      sendOtp,
      triggerLicenseCheck,
      selectedOrg,
      isMultiple,
      setOrganizations,
      setOrganizationDialogOpen,
      setUserLoggedIn,
      router,
      toast,
      searchParams,
    ],
  );

  return {
    handleSubmit,
    isLoading: isLoggingIn || isSendingOtp || isCheckingLicense,
  };
};
