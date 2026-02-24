'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth || {});
  const checkUser = async () => {
    if (user) {
      if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  };

  useEffect(() => {
    checkUser();
  }, []);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
