'use client';

import React from 'react';
import { Formik } from 'formik';
import { useCaptchaSettings } from './useCaptchaSettings';
import { captchaValidationSchema } from './schema';
import CaptchaSkeleton from './loading-skeleton';
import CaptchaForm from './captcha-form';
import { CaptchaValues, CaptchaFormProps } from './types';

export default function CaptchaSettings({ onClose }: CaptchaFormProps) {
  const {
    initialValues,
    isLoading,
    isUpdating,
    isPermissionDenied,
    handleSubmit,
  } = useCaptchaSettings(onClose);

  if (isLoading) return <CaptchaSkeleton />;

  return (
    <Formik<CaptchaValues>
      initialValues={initialValues}
      validationSchema={captchaValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(formikProps) => (
        <CaptchaForm
          formik={formikProps}
          onClose={onClose}
          isUpdating={isUpdating}
          isPermissionDenied={isPermissionDenied}
        />
      )}
    </Formik>
  );
}
