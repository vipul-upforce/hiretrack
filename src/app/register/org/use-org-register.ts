import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormikHelpers } from 'formik';
import { useToast } from '@/hooks/use-toast';
import { useCreateOrgMutation } from '@/lib/features/org/orgApi';
import { useGetCaptchaConfigsQuery } from '@/lib/features/settings/settingsApi';
import { getDecodedCaptcha } from '@/hooks/useSSE';
import logger from '@/lib/logger';
import { OrgFormValues } from './schema';

export const useOrgRegister = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [createOrg, { isLoading: isOrgLoading }] = useCreateOrgMutation();
  const { data: captchaConfig } = useGetCaptchaConfigsQuery(undefined);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // 1. Check Allowance Logic
  useEffect(() => {
    let isMounted = true;
    async function checkAllowance() {
      try {
        const response = await fetch('/api/organization');
        const allowance = await response.json();

        if (isMounted) {
          setOrganizationId(allowance.data?.[0]?.organizationId);
          if (!allowance.allow) {
            router.push('/auth/login');
          }
        }
      } catch (error) {
        logger.error('Failed to check allowance', error);
      }
    }
    checkAllowance();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Decrypt Captcha Key Logic
  useEffect(() => {
    let isMounted = true;
    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          organizationId!,
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

      // License Check
      try {
        const response = await fetch('/api/license-validate', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (!data.valid) {
          throw new Error(data.error || 'Invalid License');
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : 'License verification failed.';
        toast({
          title: 'License Error',
          description: msg,
          variant: 'destructive',
        });
        return;
      }

      // Create Organization
      try {
        const { name, email, fullName, password, role } = values;

        const payload = {
          name,
          lanes: [],
          adminData: {
            email,
            name: fullName,
            password,
            role,
          },
        };

        const orgResponse = await createOrg(payload).unwrap();

        if (orgResponse.organization) {
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
          const errorObj = err as { data?: { error?: string } };
          errorMessage = errorObj.data?.error || errorMessage;
        }

        setStatus(errorMessage);
        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [captchaConfig, captchaToken, createOrg, router, toast],
  );

  return {
    isOrgLoading,
    captchaConfig,
    decryptedSiteKey,
    captchaToken,
    setCaptchaToken,
    handleSubmit,
  };
};
