'use client';

import React, { useRef, useCallback } from 'react';
import { Formik, Form } from 'formik';
import { Building2, User, Mail, Lock } from 'lucide-react';
import {
  RecaptchaWrapper,
  RecaptchaWrapperHandle,
} from '@/components/recaptcha/RecaptchaWrapper';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import withAuthGuard from '@/components/withAuthGuard';
import { OrgRegisterSchema, INITIAL_VALUES } from './schema';
import { useOrgRegister } from './use-org-register';
import { FormInputField, FormPasswordField } from './components/form-fields';

function OrgRegisterPage() {
  const {
    isOrgLoading,
    captchaConfig,
    captchaType,
    captchaVariant,
    decryptedSiteKey,
    captchaToken,
    setCaptchaToken,
    handleSubmit,
  } = useOrgRegister();

  const recaptchaRef = useRef<RecaptchaWrapperHandle>(null);
  const pendingSubmitRef = useRef(false);
  const submitFormRef = useRef<(() => void) | null>(null);

  const isCaptchaEnabled = captchaConfig?.captcha?.enableCaptcha;
  const shouldShowCaptcha = isCaptchaEnabled && decryptedSiteKey;
  const isInvisibleV2 =
    isCaptchaEnabled &&
    captchaType === 'v2' &&
    captchaVariant === 'invisible';

  const onCaptchaChangeWrapped = useCallback(
    (token: string | null) => {
      setCaptchaToken(token);
      if (pendingSubmitRef.current && token && submitFormRef.current) {
        pendingSubmitRef.current = false;
        // Defer so captchaToken state is updated before submit runs
        setTimeout(() => submitFormRef.current?.(), 0);
      }
    },
    [setCaptchaToken],
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Decorative Background Elements */}
      <div className="bg-primary/5 absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />

      <Card className="z-10 w-full max-w-md border-border/50 shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            Register Organization
          </CardTitle>
          <CardDescription>
            Create your workspace and admin account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Formik
            initialValues={INITIAL_VALUES}
            validationSchema={OrgRegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, status }) => (
              <Form className="space-y-4">
                {status && (
                  <Alert variant="destructive">
                    <AlertDescription>{status}</AlertDescription>
                  </Alert>
                )}

                <FormInputField
                  name="name"
                  label="Organization Name"
                  placeholder="Acme Inc."
                  icon={Building2}
                  disabled={isSubmitting}
                />

                <FormInputField
                  name="fullName"
                  label="Admin Full Name"
                  placeholder="John Doe"
                  icon={User}
                  disabled={isSubmitting}
                />

                <FormInputField
                  name="email"
                  label="Admin Email"
                  placeholder="admin@example.com"
                  icon={Mail}
                  disabled={isSubmitting}
                />

                <FormPasswordField
                  name="password"
                  label="Password"
                  icon={Lock}
                  disabled={isSubmitting}
                />

                <FormPasswordField
                  name="confirmPassword"
                  label="Confirm Password"
                  icon={Lock}
                  disabled={isSubmitting}
                />

                {shouldShowCaptcha && (
                  <div
                    className={
                      isInvisibleV2
                        ? 'w-full pt-2'
                        : 'flex justify-center pt-2'
                    }
                  >
                    <div
                      className={
                        isInvisibleV2 ? 'w-full' : 'scale-90 transform'
                      }
                    >
                      <RecaptchaWrapper
                        ref={recaptchaRef}
                        siteKey={decryptedSiteKey}
                        captchaType={captchaType}
                        captchaVariant={captchaVariant}
                        onTokenGenerated={onCaptchaChangeWrapped}
                        action="org_register"
                      />
                    </div>
                  </div>
                )}

                <CardFooter className="px-0 pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    variant="primary"
                    disabled={
                      isSubmitting ||
                      isOrgLoading ||
                      (isCaptchaEnabled && !captchaToken)
                    }
                  >
                    {isSubmitting || isOrgLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Registering...</span>
                      </div>
                    ) : (
                      'Register Organization'
                    )}
                  </Button>
                </CardFooter>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuthGuard(OrgRegisterPage, {
  requiredRoles: [],
  fallbackPath: '/auth/login',
  checkAllowance: true,
  allowAuthenticated: true,
});
