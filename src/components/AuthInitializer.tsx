'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { AppDispatch } from '@/lib/redux/store';
import { refreshAccessToken } from '@/lib/api/baseApi';
import logger from '@/lib/logger';

/**
 * Helper function to get cookie value on client side
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function AuthInitializer() {
  const dispatch = useDispatch<AppDispatch>();
  const bootstrapStartedRef = useRef(false);

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }
    bootstrapStartedRef.current = true;

    const bootstrapAuth = async () => {
      const orgId = getCookie('org_id');
      if (!orgId) {
        return;
      }

      const authState = getCookie('auth_state');

      // Fast path: session flag + user fetch (fails through to refresh when access token expired)
      if (authState === 'true') {
        try {
          await dispatch(fetchUserFromToken()).unwrap();
          return;
        } catch {
          logger.info(
            'auth_state present but user fetch failed — refreshing access token',
          );
        }
      }

      try {
        await refreshAccessToken(dispatch);
      } catch (error) {
        logger.warn('Proactive token refresh failed during auth bootstrap', error);
      }
    };

    void bootstrapAuth();
  }, [dispatch]);

  return null;
}

export default AuthInitializer;
