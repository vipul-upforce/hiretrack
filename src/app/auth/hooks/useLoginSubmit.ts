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
import { useCallback, useRef } from 'react';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { useDispatch } from 'react-redux';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { AppDispatch } from '@/lib/redux/store';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import { getRedirectUrlFromSearchParams } from '@/lib/utils/redirectUtils';

interface HandleLoginSubmitProps {
  selectedOrg?: string;
  isMultiple: boolean;
  setOrganizations: (organizations: OneOfMulOrganization[]) => void;
  setOrganizationDialogOpen: (open: boolean) => void;
  setLoginFormValues: (values: LoginFormValues) => void;
  onLoginSuccess?: () => void;
}

export const useHandleLoginSubmit = ({
  selectedOrg,
  isMultiple,
  setOrganizations,
  setOrganizationDialogOpen,
  setLoginFormValues,
  onLoginSuccess,
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

  const { user } = useAppSelector((state) => state.auth);
    // Cache license check result to prevent duplicate calls
    const licenseCheckCache = useRef<{ checked: boolean; valid: boolean } | null>(null);

  const handleSubmit = useCallback(
    async (
      values: LoginFormValues,
      setIsSubmitting: (isSubmitting: boolean) => void,
      { setStatus }: { setStatus: (message: string) => void },
    ): Promise<boolean> => {
      setLoginFormValues(values);

      // // firstly check the license
      // try {
      //   const data = await triggerLicenseCheck().unwrap();

      //   if (!data.valid) {
      //     throw new Error(data.error || 'License validation failed');
      //   }
      //   // Keep button disabled during login process - don't set to false here
      // } catch (e: unknown) {
      //   // Handle license check failure
      //   let errorMessage =
      //     'License not verified. Please contact support or try re-installing the platform.';

      //   if (e && typeof e === 'object' && 'data' in e) {
      //     const errorData = e as { data?: { message?: string } };
      //     errorMessage = errorData.data?.message || 'License check failed';
      //   } else if (e instanceof Error) {
      //     errorMessage = e.message;
      //   }

      //   toast({
      //     title: 'Error',
      //     description: errorMessage,
      //     variant: 'destructive',
      //   });
      //   setIsSubmitting(false);
      //   return;
      // }
         // Check license only once per login session
         if (!licenseCheckCache.current) {
          try {
            const data = await triggerLicenseCheck().unwrap();
  
            if (!data.valid) {
              licenseCheckCache.current = { checked: true, valid: false };
              throw new Error(data.error || 'License validation failed');
            }
            
            // Cache successful license check
            licenseCheckCache.current = { checked: true, valid: true };
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
            return false;
          }
        } else if (!licenseCheckCache.current.valid) {
          // If license was already checked and invalid, return early
          toast({
            title: 'Error',
            description: 'License validation failed',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return false;
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
          setIsSubmitting(false);
          return false;
        }

        // Handle 2FA
        const is2FAEnabled = response.twofa;
        if (is2FAEnabled) {
          const { organizationId } = response;
          try {
            // Ensure URL components are properly encoded to prevent issues with special characters
            const encodedEmail = encodeURIComponent(
              values.email.toLowerCase().trim(),
            );
            const encodedOrgId = encodeURIComponent(
              organizationId?.toString() || '',
            );
            const url =
              `/auth/2fa/verify?email=${encodedEmail}&orgId=${encodedOrgId}${response?.isCandidate ? '&isCandidate=true' : ''}` as string;

            // Keep button disabled during OTP sending - button will be disabled via isLoading state
            await sendOtp({
              email: values.email.toLowerCase().trim(),
              organizationId,
              isCandidate: response.isCandidate,
            })
              .unwrap()
              .then(() => {
                setIsSubmitting(false);
                toast({
                  title: 'Check your email',
                  description: 'An OTP has been sent to your email address.',
                  variant: 'default',
                });
                router.push(url);
                localStorage.setItem(
                  `otp_cooldown_${values.email.toLowerCase().trim()}_${organizationId}`,
                  Date.now().toString()
                );
              });
          } catch (error) {
            logger.error(error);
            const errorMessage =
              (error as { data?: { message: string } })?.data?.message ||
              (error instanceof Error ? error.message : 'Failed to send OTP');

            setStatus(errorMessage);
            setIsSubmitting(false);
            toast({
              title: 'Error',
              description: errorMessage,
              variant: 'destructive',
            });
          }
          return false; // Return early after OTP handling to prevent further execution
        }

        // Only proceed if login was successful
        if (response.loggedIn === true) {
          onLoginSuccess?.();

          // Handle Redirects & Redux State
          const redirectUrl = getRedirectUrlFromSearchParams(
            searchParams,
            response.user || user,
            isMultiple,
          );
          dispatch(fetchUserFromToken());
          const target = redirectUrl !== '/' ? redirectUrl : '/dashboard';
          router.push(target);
          setUserLoggedIn(true);
          setIsSubmitting(false);
          toast({
            title: 'Success',
            description: 'Login successful',
            variant: 'default',
          });
          return true;
        }

        // Explicitly handle case where loggedIn is false/undefined
        logger.warn('Login response indicates not logged in', {
          loggedIn: response.loggedIn,
          hasOrganizations: !!response.organizations,
        });
        setIsSubmitting(false);
        return false;
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
        setIsSubmitting(false);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
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
      user,
      onLoginSuccess,
    ],
  );

  return {
    handleSubmit,
    isLoading: isLoggingIn || isSendingOtp || isCheckingLicense,
  };
};
