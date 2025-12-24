'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { AppDispatch } from '@/lib/redux/store';
import { useAppSelector } from '@/lib/redux/hooks';

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
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check auth_state cookie and fetch user only if authenticated
    const authState = getCookie('auth_state');
    const orgId = getCookie('org_id');
    if (authState === 'true' && (orgId || !user || user === null)) {
      dispatch(fetchUserFromToken());
    }
  }, [dispatch]);

  return null;
}

export default AuthInitializer;
