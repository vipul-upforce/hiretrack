'use client';

import { useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

interface UseRecaptchaV3Options {
  siteKey: string;
  action?: string;
  onTokenGenerated?: (token: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for Google reCAPTCHA v3 (score-based)
 * Automatically loads the reCAPTCHA v3 script and provides execute function
 */
export function useRecaptchaV3({
  siteKey,
  action = 'submit',
  onTokenGenerated,
  onError,
}: UseRecaptchaV3Options) {
  const scriptLoaded = useRef(false);
  const scriptId = 'recaptcha-v3-script';

  // Load reCAPTCHA v3 script
  useEffect(() => {
    if (!siteKey || scriptLoaded.current) return;

    // Check if script already exists
    if (document.getElementById(scriptId)) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      const error = new Error('Failed to load reCAPTCHA v3 script');
      onError?.(error);
    };

    document.head.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
        scriptLoaded.current = false;
      }
    };
  }, [siteKey, onError]);

  /**
   * Execute reCAPTCHA v3 and get token
   */
  const execute = useCallback(async (): Promise<string | null> => {
    if (!siteKey) {
      const error = new Error('reCAPTCHA site key is required');
      onError?.(error);
      return null;
    }

    if (!window.grecaptcha) {
      const error = new Error('reCAPTCHA script not loaded');
      onError?.(error);
      return null;
    }

    try {
      return new Promise((resolve, reject) => {
        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(siteKey, { action });
            onTokenGenerated?.(token);
            resolve(token);
          } catch (error) {
            const err =
              error instanceof Error
                ? error
                : new Error('Failed to execute reCAPTCHA');
            onError?.(err);
            reject(err);
          }
        });
      });
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('reCAPTCHA execution failed');
      onError?.(err);
      return null;
    }
  }, [siteKey, action, onTokenGenerated, onError]);

  return {
    execute,
    isReady: scriptLoaded.current && !!window.grecaptcha,
  };
}
