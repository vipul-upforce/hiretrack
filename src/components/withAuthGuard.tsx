'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NextPage } from 'next';
import { useLazyGetOrganizationAllowanceQuery } from '@/lib/features/org/orgApi';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import { AuthGuardLoading } from './ui/authGuardLoader';

let allowanceCache: {
  value: boolean | null;
  timestamp: number | null;
  userId: string | null;
} = {
  value: null,
  timestamp: null,
  userId: null,
};

const CACHE_DURATION = 5 * 60 * 1000;

interface AuthGuardOptions {
  requiredRoles?: string[];
  fallbackPath?: string;
  checkAllowance?: boolean;
  allowAuthenticated?: boolean;
}

const withAuthGuard = <P extends object>(
  WrappedComponent: NextPage<P>,
  options: AuthGuardOptions = {},
): NextPage<P> => {
  const {
    requiredRoles = [],
    fallbackPath = '/dashboard',
    checkAllowance = false,
    allowAuthenticated = true,
  } = options;

  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function AuthGuardComponent(props: P) {
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);

    const router = useRouter();
    const pathname = usePathname();

    const [getOrgAllowance] = useLazyGetOrganizationAllowanceQuery();

    const isAllowanceCacheValid = useCallback(() => {
      const currentUserId = user?.id || null;
      return (
        allowanceCache.value !== null &&
        allowanceCache.timestamp !== null &&
        allowanceCache.userId === currentUserId &&
        Date.now() - allowanceCache.timestamp < CACHE_DURATION
      );
    }, [user?.id]);

    const getInitialAuthState = () => {
      if (isAuthenticated === undefined) {
        return 'loading';
      }

      if (pathname === '/register/org' && checkAllowance) {
        return 'loading';
      }

      if (checkAllowance && !isAllowanceCacheValid()) {
        return 'loading';
      }

      if (!allowAuthenticated && isAuthenticated) {
        return 'unauthorized';
      }

      if (allowAuthenticated && !isAuthenticated) {
        return 'unauthorized';
      }

      if (
        isAuthenticated &&
        requiredRoles.length > 0 &&
        (!user?.role || !requiredRoles.includes(user.role))
      ) {
        return 'unauthorized';
      }

      return 'authorized';
    };
    const [authState, setAuthState] = useState<
      'loading' | 'authorized' | 'unauthorized'
    >(getInitialAuthState);
    const isCheckingAllowance = useRef(false);
    const hasInitialized = useRef(false);

    const fetchAllowance = useCallback(async (): Promise<boolean> => {
      const currentUserId = user?.id || null;

      if (isAllowanceCacheValid()) {
        return allowanceCache.value!;
      }

      if (isCheckingAllowance.current) {
        return allowanceCache.value ?? false;
      }

      isCheckingAllowance.current = true;

      try {
        const allowanceData = await getOrgAllowance().unwrap();

        // Update cache
        allowanceCache = {
          value: allowanceData.allow,
          timestamp: Date.now(),
          userId: currentUserId,
        };

        return allowanceData.allow;
      } catch (error) {
        logger.error('Allowance check failed:', error);
        return false;
      } finally {
        isCheckingAllowance.current = false;
      }
    }, [user?.id, isAllowanceCacheValid, getOrgAllowance]);

    const performAuthCheck = useCallback(async () => {
      try {
        if (pathname === '/register/org') {
          if (checkAllowance) {
            const hasAllowance = await fetchAllowance();
            if (!hasAllowance) {
              router.replace(fallbackPath);
              setAuthState('unauthorized');
              return;
            }
          }
          setAuthState('authorized');
          return;
        }

        if (checkAllowance) {
          const hasAllowance = await fetchAllowance();
          if (!hasAllowance) {
            router.replace(fallbackPath);
            setAuthState('unauthorized');
            return;
          }
        }

        if (!allowAuthenticated && isAuthenticated) {
          router.replace(fallbackPath);
          setAuthState('unauthorized');
          return;
        }

        if (allowAuthenticated && !isAuthenticated) {
          router.replace(fallbackPath);
          setAuthState('unauthorized');
          return;
        }

        if (
          isAuthenticated &&
          requiredRoles.length > 0 &&
          (!user?.role || !requiredRoles.includes(user.role))
        ) {
          router.replace(fallbackPath);
          setAuthState('unauthorized');
          return;
        }

        setAuthState('authorized');
      } catch (error) {
        logger.error('Auth check failed:', error);
        setAuthState('unauthorized');
      }
    }, [
      pathname,
      checkAllowance,
      allowAuthenticated,
      isAuthenticated,
      user?.id,
      user?.role,
      requiredRoles,
      fetchAllowance,
      router,
      fallbackPath,
    ]);

    useEffect(() => {
      if (isAuthenticated === undefined) {
        setAuthState('loading');
        return;
      }

      if (authState !== 'loading' && !checkAllowance) {
        return;
      }

      performAuthCheck();
      hasInitialized.current = true;
    }, [pathname, isAuthenticated, user?.id, user?.role, performAuthCheck]);

    useEffect(() => {
      const currentUserId = user?.id || null;
      if (allowanceCache.userId && allowanceCache.userId !== currentUserId) {
        allowanceCache = {
          value: null,
          timestamp: null,
          userId: null,
        };
      }
    }, [user?.id]);

    if (authState === 'loading') {
      return <AuthGuardLoading />;
    }

    return authState === 'authorized' ? (
      <WrappedComponent
        {...({ ...props, user: { role: user?.role || null } } as P)}
      />
    ) : null;
  }

  AuthGuardComponent.displayName = `withAuthGuard(${displayName})`;

  return AuthGuardComponent;
};

export default withAuthGuard;
