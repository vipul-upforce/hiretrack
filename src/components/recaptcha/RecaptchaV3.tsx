'use client';

import { useEffect } from 'react';
import { useRecaptchaV3 } from '@/hooks/useRecaptchaV3';

interface RecaptchaV3Props {
  siteKey: string;
  action?: string;
  onTokenGenerated: (token: string) => void;
  onError?: (error: Error) => void;
  autoExecute?: boolean;
}

/**
 * reCAPTCHA v3 Component
 * Automatically executes on mount if autoExecute is true
 * Otherwise, use the execute function from the hook
 */
export function RecaptchaV3({
  siteKey,
  action = 'submit',
  onTokenGenerated,
  onError,
  autoExecute = true,
}: RecaptchaV3Props) {
  const { execute, isReady } = useRecaptchaV3({
    siteKey,
    action,
    onTokenGenerated,
    onError,
  });

  useEffect(() => {
    if (autoExecute && isReady && siteKey) {
      execute().catch((error) => {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }, [autoExecute, isReady, siteKey, execute, onError]);

  // v3 is invisible, so no visual component
  return null;
}
