'use client';

import { Suspense } from 'react';
import LoadingScreen from '@/app/loading-screen';
import LoginFormContent from './LoginFormContent';

export default function Login() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginFormContent showCompanyField={false} />
    </Suspense>
  );
}
