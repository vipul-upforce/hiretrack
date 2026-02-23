'use client';

import './recaptcha-invisible.css';
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { RecaptchaV3 } from './RecaptchaV3';

export interface RecaptchaWrapperHandle {
  /** Execute reCAPTCHA (for v2 invisible). No-op for v2 checkbox / v3. */
  execute: () => void;
}

interface RecaptchaWrapperProps {
  siteKey: string;
  captchaType: 'v2' | 'v3';
  captchaVariant?: 'checkbox' | 'invisible';
  theme?: 'light' | 'dark';
  onTokenGenerated: (token: string | null) => void;
  onError?: (error: Error) => void;
  action?: string; // For v3
}

/**
 * Unified reCAPTCHA wrapper component that supports:
 * - v2 checkbox: "I am not a robot" checkbox
 * - v2 invisible: Invisible badge (execute on submit, then get token)
 * - v3: Score-based (invisible)
 */
const RecaptchaWrapperComponent = forwardRef<
  RecaptchaWrapperHandle,
  RecaptchaWrapperProps
>((
  {
    siteKey,
    captchaType,
    captchaVariant = 'checkbox',
    theme = 'light',
    onTokenGenerated,
    onError,
    action = 'submit',
  },
  ref,
) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleV2Change = (token: string | null) => {
    onTokenGenerated(token);
  };

  useImperativeHandle(
    ref,
    () => ({
      execute() {
        if (
          captchaType === 'v2' &&
          captchaVariant === 'invisible' &&
          recaptchaRef.current
        ) {
          recaptchaRef.current.execute();
        }
      },
    }),
    [captchaType, captchaVariant],
  );

  // For v3, use the v3 component
  if (captchaType === 'v3') {
    console.log("V3 ECATCAH COMPENT OADED!")
    return (
      <RecaptchaV3
        siteKey={siteKey}
        action={action}
        onTokenGenerated={onTokenGenerated}
        onError={onError}
        autoExecute
      />
    );
  }

  // For v2 invisible: widget is off-screen (zero layout space); only disclosure text is visible
  if (captchaVariant === 'invisible') {
    return (
      <div className="recaptcha-container recaptcha-container--invisible ">
        <div className="recaptcha-container--invisible-widget w-0 overflow-x-hidden">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={siteKey}
            size="invisible"
            badge="inline"
            onChange={(token) => {
              if (process.env.NODE_ENV === 'development' && token) {
                // eslint-disable-next-line no-console
                console.log('[reCAPTCHA] Invisible v2 token received – captcha flow OK');
              }
              handleV2Change(token);
            }}
            theme={theme}
          />
        </div>
        <p className="recaptcha-disclosure" aria-hidden="true">
          This site is protected by reCAPTCHA and the Google{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="recaptcha-disclosure__link"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="recaptcha-disclosure__link"
          >
            Terms of Service
          </a>{' '}
          apply.
        </p>
      </div>
    );
  }

  // For v2 checkbox (default)
  return (
    <div className="recaptcha-container">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={handleV2Change}
        theme={theme}
      />
    </div>
  );
});

export { RecaptchaWrapperComponent as RecaptchaWrapper };
