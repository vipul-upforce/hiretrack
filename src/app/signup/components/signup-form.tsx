'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Formik, Form, Field, FieldProps } from 'formik';
import { motion } from 'framer-motion';
import { Mail, Lock, User } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Checkbox } from '@/components/ui/checkbox';
import { SignupSchema } from '../signupSchema';
import { TermsAndConditionsDialog } from '../TermsAndConditionsDialog';
import { FormInput } from './form-input';
import { useSignupLogic } from '../hooks/useSignupLogic';
import '../recaptcha-theme.css';

const initialValues = {
  email: '',
  password: '',
  name: '',
  confirmPassword: '',
  termsAccepted: false,
};

export function SignupForm() {
  const {
    theme,
    portalSettings,
    orgName,
    decryptedSiteKey,
    captchaConfig,
    showTermsDialog,
    setShowTermsDialog,
    isSignupLoading,
    handleSignupSubmit,
  } = useSignupLogic();

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative mx-auto w-full max-w-md lg:max-w-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Hover Glow Effect */}
      {isHovering && (
        <motion.div
          className="pointer-events-none absolute hidden h-96 w-96 rounded-full blur-3xl lg:block"
          style={{
            background: `linear-gradient(135deg, ${portalSettings.primaryColor}20, ${portalSettings.secondaryColor}20, ${portalSettings.primaryColor}15)`,
            transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        />
      )}

      <div className="relative rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">Create Account</h2>
          {orgName && (
            <div className="mt-2">
              <span
                className="text-lg font-medium"
                style={{
                  color: portalSettings.primaryColor,
                  animation: orgName
                    ? 'fadeInOrg 0.9s ease-in-out forwards'
                    : 'none',
                }}
              >
                {orgName}
              </span>
            </div>
          )}
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={SignupSchema}
          onSubmit={handleSignupSubmit}
        >
          {({ errors, touched, isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-5">
              <FormInput
                name="name"
                label="Full Name"
                placeholder="Enter your full name"
                icon={User}
                primaryColor={portalSettings.primaryColor}
                disabled={isSignupLoading || isSubmitting}
                errors={errors}
                touched={touched}
              />
              <FormInput
                name="email"
                label="Email Address"
                placeholder="Enter your email"
                type="email"
                icon={Mail}
                primaryColor={portalSettings.primaryColor}
                disabled={isSignupLoading || isSubmitting}
                errors={errors}
                touched={touched}
              />
              <FormInput
                name="password"
                label="Password"
                placeholder="Enter your password"
                type="password"
                icon={Lock}
                primaryColor={portalSettings.primaryColor}
                disabled={isSignupLoading || isSubmitting}
                errors={errors}
                touched={touched}
              />
              <FormInput
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Confirm your password"
                type="password"
                icon={Lock}
                primaryColor={portalSettings.primaryColor}
                disabled={isSignupLoading || isSubmitting}
                errors={errors}
                touched={touched}
              />

              {/* CAPTCHA */}
              {captchaConfig?.captcha?.enableCaptcha && decryptedSiteKey && (
                <div className="flex origin-center scale-90 justify-center sm:scale-100">
                  <div className="recaptcha-container">
                    <ReCAPTCHA
                      sitekey={decryptedSiteKey}
                      onChange={(token) => setCaptchaToken(token)}
                      theme={theme as 'light' | 'dark'}
                    />
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <Field name="termsAccepted">
                {({ field }: FieldProps) => (
                  <div className="space-y-1">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="termsAccepted"
                        checked={field.value}
                        onCheckedChange={() => {
                          setShowTermsDialog(true);
                          setFieldValue('termsAccepted', false);
                        }}
                      />
                      <label
                        htmlFor="termsAccepted"
                        className="text-xs sm:text-sm"
                      >
                        I agree to the{' '}
                        <button
                          type="button"
                          className="underline"
                          style={{ color: portalSettings.primaryColor }}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowTermsDialog(true);
                            setFieldValue('termsAccepted', false);
                          }}
                        >
                          Terms
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          className="underline"
                          style={{ color: portalSettings.primaryColor }}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowTermsDialog(true);
                            setFieldValue('termsAccepted', false);
                          }}
                        >
                          Privacy Policy
                        </button>
                      </label>
                    </div>
                    {errors.termsAccepted && touched.termsAccepted && (
                      <div className="text-sm text-red-500">
                        {errors.termsAccepted}
                      </div>
                    )}
                  </div>
                )}
              </Field>

              <motion.button
                type="submit"
                disabled={
                  isSignupLoading ||
                  isSubmitting ||
                  !values?.termsAccepted ||
                  (captchaConfig?.captcha?.enableCaptcha && !captchaToken)
                }
                className="group relative w-full overflow-hidden rounded-lg py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${portalSettings.primaryColor}, ${portalSettings.secondaryColor})`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
                {isSignupLoading || isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Account...
                  </div>
                ) : (
                  'Sign Up'
                )}
              </motion.button>

              <div className="pt-4 text-center">
                <span className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                </span>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium hover:underline"
                  style={{ color: portalSettings.primaryColor }}
                >
                  Sign in here
                </Link>
              </div>

              <TermsAndConditionsDialog
                open={showTermsDialog}
                onOpenChange={setShowTermsDialog}
                onAccept={(accepted: boolean) => {
                  setFieldValue('termsAccepted', accepted);
                  setShowTermsDialog(false);
                }}
              />
            </Form>
          )}
        </Formik>
      </div>
    </motion.div>
  );
}
