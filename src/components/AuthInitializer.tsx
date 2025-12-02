"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { AppDispatch } from '@/lib/redux/store';
import { setupTokenRefreshInterceptor } from '@/lib/api/refreshTokenInterceptor';

const AuthInitializer = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Set up token refresh interceptor
    setupTokenRefreshInterceptor();
    
    // Fetch user from token
    dispatch(fetchUserFromToken());
  }, [dispatch]);

  return null;
};

export default AuthInitializer;
