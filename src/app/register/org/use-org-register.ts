import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormikHelpers } from 'formik';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateOrgMutation,
  useGetOrganizationAllowanceQuery,
} from '@/lib/features/org/orgApi';
import { useGetCaptchaConfigsQuery } from '@/lib/features/settings';
import { useLogoutUserMutation } from '@/lib/features/auth/authApi';
import { getDecodedCaptcha } from '@/hooks/useSSE';
import { OrgFormValues } from './schema';

export const useOrgRegister = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [createOrg, { isLoading: isOrgLoading }] = useCreateOrgMutation();
  const { data: captchaConfig } = useGetCaptchaConfigsQuery(undefined);

  const { data: allowanceData } = useGetOrganizationAllowanceQuery(undefined);

  const [triggerLogout] = useLogoutUserMutation();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);

  const organizationId = allowanceData?.data?.[0]?.organizationId;

  useEffect(() => {
    if (allowanceData && !allowanceData.allow) {
      router.push('/auth/login');
    }
  }, [allowanceData, router]);

  // 2. Decrypt Captcha Key Logic
  useEffect(() => {
    let isMounted = true;

    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey && organizationId) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          organizationId,
        );
        if (isMounted && decrypted) {
          setDecryptedSiteKey(decrypted);
        }
      }
    };

    decryptSiteKey();

    return () => {
      isMounted = false;
    };
  }, [captchaConfig, organizationId]);

  // 3. Form Submission Logic
  const handleSubmit = useCallback(
    async (
      values: OrgFormValues,
      { setStatus }: FormikHelpers<OrgFormValues>,
    ) => {
      // Captcha Check
      if (captchaConfig?.captcha.enableCaptcha && !captchaToken) {
        toast({
          title: 'Validation Error',
          description: 'Captcha not verified. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const { name, email, fullName, password, role } = values;

        const payload = {
          name,
          lanes: [],
          adminData: {
            email: email.toLowerCase().trim(),
            name: fullName.trim(),
            password,
            role,
          },
        };

        const orgResponse = await createOrg(payload).unwrap();

        if (orgResponse.organization) {
          if (orgResponse.logout === true) {
            await triggerLogout().unwrap();
          }
          toast({
            title: 'Success',
            description: 'Organization and Admin account created successfully.',
            variant: 'default',
          });
          router.push('/auth/login');
        } else {
          throw new Error('Failed to create organization structure.');
        }
      } catch (err: unknown) {
        let errorMessage = 'An unknown error occurred';

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'data' in err) {
          const errorObj = err as {
            data?: { error?: string; message?: string };
          };
          errorMessage =
            errorObj.data?.error || errorObj.data?.message || errorMessage;
        }

        setStatus(errorMessage);
        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [
      captchaConfig,
      captchaToken,
      createOrg,
      triggerLogout,
      router,
      toast,
    ],
  );

  return {
    isOrgLoading,
    captchaConfig,
    captchaType:
      (captchaConfig?.captcha?.captchaType as 'v2' | 'v3') || 'v2',
    captchaVariant:
      (captchaConfig?.captcha?.captchaVariant as 'checkbox' | 'invisible') ||
      'checkbox',
    decryptedSiteKey,
    captchaToken,
    setCaptchaToken,
    handleSubmit,
  };
};
