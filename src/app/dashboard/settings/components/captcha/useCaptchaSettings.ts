import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useGetCaptchaConfigsQuery,
  useUpdateCaptchaMutation,
} from '@/lib/features/settings';
import { getDecodedCaptcha } from '@/hooks/useSSE';
import { CaptchaValues } from './types';

export const useCaptchaSettings = (onClose: () => void) => {
  const { toast } = useToast();
  const orgId = Cookies.get('org_id');

  const { data, isLoading, refetch, error } =
    useGetCaptchaConfigsQuery(undefined);
  const [updateCaptchaConfigs, { isLoading: isUpdating }] =
    useUpdateCaptchaMutation();

  const [decryptedValues, setDecryptedValues] = useState<{
    siteKey: string;
    secretKey: string;
  }>({ siteKey: '', secretKey: '' });

  // Decrypt siteKey and secretKey when data is available
  useEffect(() => {
    const decryptData = async () => {
      if (data?.captcha) {
        try {
          const [decryptedSiteKey, decryptedSecretKey] = await Promise.all([
            getDecodedCaptcha(data.captcha.siteKey || '', orgId as string),
            getDecodedCaptcha(data.captcha.secretKey || '', orgId as string),
          ]);

          setDecryptedValues({
            siteKey: decryptedSiteKey || '',
            secretKey: decryptedSecretKey || '',
          });
        } catch (e) {
          logger.error('Failed to decrypt captcha keys', e);
        }
      }
    };
    decryptData();
  }, [data, orgId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: CaptchaValues = {
    enableCaptcha: !!data?.captcha?.enableCaptcha,
    siteKey: decryptedValues.siteKey,
    secretKey: decryptedValues.secretKey,
  };

  const isPermissionDenied = error && 'status' in error && error.status === 403;

  const handleSubmit = async (values: CaptchaValues) => {
    if (isPermissionDenied) {
      toast({
        title: 'Not Allowed',
        description: 'This action is not allowed.',
        variant: 'destructive',
      });

      return;
    }

    try {
      await updateCaptchaConfigs({
        enableCaptcha: values.enableCaptcha,
        siteKey: values.siteKey,
        secretKey: values.secretKey,
      }).unwrap();

      toast({
        title: 'Success',
        description: 'CAPTCHA settings updated successfully',
      });

      refetch();
      onClose();
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.data?.error || 'Failed to update CAPTCHA settings',
        variant: 'destructive',
      });
    }
  };

  return {
    initialValues,
    isLoading,
    isUpdating,
    isPermissionDenied: !!isPermissionDenied,
    handleSubmit,
  };
};
