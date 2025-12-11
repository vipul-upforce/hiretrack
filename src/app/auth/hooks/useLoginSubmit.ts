'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useLoginMutation } from '@/lib/features/auth/authApi';
import { useCustomFields } from '@/Custom_Fields/hooks/use-customFields';

import { LoginFormValues } from '@/types/login';
import { useCallback } from 'react';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { AppDispatch } from '@/lib/redux/store';
import logger from '@/lib/logger';

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
  const [login, { isLoading }] = useLoginMutation();
  const { setUserLoggedIn } = useCustomFields();
  const dispatch = useDispatch<AppDispatch>();

  const { user, isAuthenticated } = useSelector((state: any) => state.auth);
  // debugger

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
      // debugger
      setLoginFormValues(values);
      // firstly check the license
      // try {
      //   const response = await fetch('/api/license-validate', {
      //     method: 'GET',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //   });
      //   const data = await response.json();
      //   if (!data.valid) {
      //     throw new Error(data.error);
      //   }
      //   setIsSubmitting(false);
      // } catch (e: unknown) {
      //   toast({
      //     title: 'Error',
      //     description:
      //       e instanceof Error
      //         ? e.message
      //         : 'License not verified. Please contact support or try re-installing the platform.',
      //     variant: 'destructive',
      //   });
      //   setIsSubmitting(false);
      //   return;
      // }
      try {
        const response = await login({
          ...values,
          email: values.email.toLowerCase().trim(),
          orgId: selectedOrg,
        }).unwrap();

        if (
          response.organizations &&
          response.organizations.length > 1 &&
          !selectedOrg
        ) {
          setOrganizations(response.organizations);
          setOrganizationDialogOpen(true);
          return;
        }
        const is2FAEnabled = response.twofa;
        if (is2FAEnabled) {
          const { organizationId } = response;
          try {
            const otpResponse = await fetch('/api/auth/2fa/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: values.email.toLowerCase().trim(),
                organizationId,
              }),
            });
            if (!otpResponse.ok) {
              const errorData = await otpResponse.json();
              throw new Error(errorData.message || 'Failed to send OTP');
            }

            toast({
              title: 'Check your email',
              description: 'An OTP has been sent to your email address.',
              variant: 'default',
            });
            router.push(
              `/auth/2fa/verify?email=${values.email.toLowerCase().trim()}&orgId=${organizationId}`,
            );
          } catch (error) {
            logger.error(error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'An unknown error occurred';
            setStatus(errorMessage);
            toast({
              title: 'Error',
              description: errorMessage,
              variant: 'destructive',
            });
          }
          return;
        }

        const redirectUrl = getRedirectUrl();
        if (isAuthenticated) {
          if (redirectUrl !== '/') {
            window.location.href = redirectUrl;
          }

          setUserLoggedIn(true);

          toast({
            title: 'Success',
            description: 'Login successful',
            variant: 'default',
          });
        }

        dispatch(fetchUserFromToken());
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

  return { handleSubmit, isLoading };
};
