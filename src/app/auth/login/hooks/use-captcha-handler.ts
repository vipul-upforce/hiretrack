import { useState, useEffect } from 'react';
import { useGetCaptchaConfigsQuery } from '@/lib/features/settings';
import { useFetchOrgQuery } from '@/lib/features/org/orgApi';
import { getDecodedCaptcha } from '@/hooks/useSSE';

export function useCaptchaHandler() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);

  const {
    data: captchaConfig,
    isLoading: isCaptchaLoading,
    error: captchaError,
  } = useGetCaptchaConfigsQuery(undefined);

  const {
    data: orgResponse,
    isLoading: isOrgLoading,
    error: orgError,
  } = useFetchOrgQuery(undefined);

  useEffect(() => {
    const decryptSiteKey = async () => {
      if (
        captchaConfig?.captcha?.siteKey &&
        orgResponse?.data?.[0]?.organizationId
      ) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          orgResponse.data[0].organizationId,
        );
        if (decrypted) setDecryptedSiteKey(decrypted);
      }
    };
    decryptSiteKey();
  }, [captchaConfig, orgResponse]);

  return {
    isEnabled: captchaConfig?.captcha?.enableCaptcha,
    captchaType: (captchaConfig?.captcha?.captchaType as 'v2' | 'v3') || 'v2',
    captchaVariant:
      (captchaConfig?.captcha?.captchaVariant as 'checkbox' | 'invisible') ||
      'checkbox',
    siteKey: decryptedSiteKey,
    captchaToken,
    setCaptchaToken,
    isLoading: isCaptchaLoading || isOrgLoading,
    error: captchaError || orgError,
  };
}
