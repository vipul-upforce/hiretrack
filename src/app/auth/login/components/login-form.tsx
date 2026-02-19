'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useFormik } from 'formik';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Building2 } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import {
  RecaptchaWrapper,
  RecaptchaWrapperHandle,
} from '@/components/recaptcha/RecaptchaWrapper';
import '../recaptcha-theme.css';

import { loginSchema, LoginSchemaType } from '../schemas/login-schema';
import { BrandingConfig, OneOfMulOrganization } from '../types';

interface LoginFormProps {
  branding: BrandingConfig;
  onSubmit: (
    data: LoginSchemaType,
    setSubmitting: (isSubmitting: boolean) => void,
  ) => void;
  isLoading: boolean;
  isSuccess: boolean;
  showCompanyField?: boolean;
  captchaEnabled?: boolean;
  captchaType?: 'v2' | 'v3';
  captchaVariant?: 'checkbox' | 'invisible';
  captchaSiteKey: string | null;
  captchaToken: string | null;
  onCaptchaChange: (token: string | null) => void;
  onForgotPassword: () => void;
  onOrgClick: () => void;
  selectedOrgId?: string;
  organizations: OneOfMulOrganization[];
  showCandidateSignup?: boolean;
  onSignupClick?: () => void;
}

export function LoginForm({
  branding,
  onSubmit,
  isLoading,
  isSuccess,
  showCompanyField,
  captchaEnabled,
  captchaType = 'v2',
  captchaVariant = 'checkbox',
  captchaSiteKey,
  captchaToken,
  onCaptchaChange,
  onForgotPassword,
  onOrgClick,
  selectedOrgId,
  organizations,
  showCandidateSignup,
  onSignupClick,
}: LoginFormProps) {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const recaptchaRef = useRef<RecaptchaWrapperHandle>(null);
  const pendingSubmitRef = useRef(false);

  // Initialize Formik
  const formik = useFormik<LoginSchemaType>({
    initialValues: {
      email: '',
      password: '',
      companyName: '',
      rememberMe: false,
    },
    validationSchema: loginSchema,
    onSubmit: (values, { setSubmitting }) => {
      onSubmit(values, setSubmitting);
    },
  });

  const isInvisibleV2 =
    captchaEnabled &&
    captchaType === 'v2' &&
    captchaVariant === 'invisible';

  const onCaptchaChangeWrapped = useCallback(
    (token: string | null) => {
      onCaptchaChange(token);
      if (pendingSubmitRef.current && token) {
        pendingSubmitRef.current = false;
        setTimeout(() => formik.submitForm(), 0);
      }
    },
    [onCaptchaChange, formik],
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (isInvisibleV2 && !captchaToken && recaptchaRef.current) {
        e.preventDefault();
        pendingSubmitRef.current = true;
        recaptchaRef.current.execute();
        return;
      }
      formik.handleSubmit(e);
    },
    [isInvisibleV2, captchaToken, formik],
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const selectedOrgName = organizations.find(
    (o) => o.orgId === selectedOrgId,
  )?.name;

  const isBusy = isLoading || formik.isSubmitting;
  const isDisabled =
    isBusy ||
    isSuccess ||
    (captchaEnabled &&
      !isInvisibleV2 &&
      !captchaToken);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Glow Effect on Hover */}
      {isHovering && (
        <motion.div
          className="pointer-events-none absolute h-96 w-96 rounded-full blur-3xl"
          style={{
            background: `linear-gradient(135deg, ${branding.primaryColor}20, ${branding.secondaryColor}20, ${branding.primaryColor}15)`,
            transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        />
      )}

      <div className="relative w-full justify-self-center rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl max-lg:w-[60vw] max-md:w-full">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">Welcome</h2>
          {selectedOrgId && (
            <div className="mt-2">
              <button
                type="button"
                className="cursor-pointer text-left text-lg font-medium"
                style={{ color: branding.primaryColor }}
                onClick={onOrgClick}
              >
                {selectedOrgName}
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {showCompanyField && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="companyName">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.companyName}
                  className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-4 transition-all focus:border-current focus:outline-none focus:ring-2"
                  style={
                    {
                      '--tw-ring-color': `${branding.primaryColor}50`,
                    } as React.CSSProperties
                  }
                  placeholder="Enter your company name"
                />
              </div>
              {formik.touched.companyName && formik.errors.companyName && (
                <span className="text-xs text-red-500">
                  {formik.errors.companyName}
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <input
                id="email"
                name="email"
                type="email"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
                className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-4 transition-all focus:border-current focus:outline-none focus:ring-2"
                style={
                  {
                    '--tw-ring-color': `${branding.primaryColor}50`,
                  } as React.CSSProperties
                }
                placeholder="Enter your email"
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <span className="text-xs text-red-500">
                {formik.errors.email}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
                className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-12 transition-all focus:border-current focus:outline-none focus:ring-2"
                style={
                  {
                    '--tw-ring-color': `${branding.primaryColor}50`,
                  } as React.CSSProperties
                }
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {formik.touched.password && formik.errors.password && (
              <span className="text-xs text-red-500">
                {formik.errors.password}
              </span>
            )}
          </div>

          {captchaEnabled && captchaSiteKey && (
            <div
              className={
                captchaVariant === 'invisible'
                  ? 'w-full'
                  : 'flex justify-center'
              }
            >
              <RecaptchaWrapper
                ref={recaptchaRef}
                siteKey={captchaSiteKey}
                captchaType={captchaType}
                captchaVariant={captchaVariant}
                theme={theme as 'light' | 'dark'}
                onTokenGenerated={onCaptchaChangeWrapped}
                action="login"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center space-x-2">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                checked={formik.values.rememberMe}
                className="rounded border-border"
              />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm hover:underline"
              style={{ color: branding.primaryColor }}
            >
              Forgot password?
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={isDisabled}
            className="group relative w-full overflow-hidden rounded-lg py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
            {isBusy || isSuccess ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isSuccess ? 'Redirecting...' : 'Signing in...'}
              </div>
            ) : (
              'Sign In'
            )}
          </motion.button>

          {showCandidateSignup && (
            <div className="pt-2 duration-300 animate-in fade-in zoom-in slide-in-from-top-2">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Don&apos;t have an account?
                  </span>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onSignupClick}
                disabled={isDisabled}
                className="border-primary/50 hover:bg-primary/5 w-full rounded-lg border-2 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Sign Up as Candidate
              </motion.button>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
}
