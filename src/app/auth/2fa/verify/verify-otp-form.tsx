'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fetchUserFromToken } from '@/lib/redux/authSlice';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '@/lib/features/auth/authApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { getRedirectUrlFromSearchParams } from '@/lib/utils/redirectUtils';

export default function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [isInitializing, setIsInitializing] = useState(true);

  const email = searchParams?.get('email');
  const organizationId = searchParams?.get('orgId');
  const isCandidate = searchParams?.get('isCandidate') === 'true';
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isSending }] = useSendOtpMutation();

  const isLoading = isVerifying || isSending;
  const storageKey = `otp_cooldown_${email}_${organizationId}`;
  const storedTimestamp = localStorage.getItem(storageKey);
  // Initialize cooldown from localStorage on mount
  useEffect(() => {
    const initializeCooldown = () => {
      if (!email || !organizationId) {
        setIsInitializing(false);
        return;
      }
      if (storedTimestamp) {
        const sentTime = parseInt(storedTimestamp, 10);
        const elapsed = Math.floor((Date.now() - sentTime) / 1000);
        const remaining = Math.max(0, 60 - elapsed);

        if (remaining > 0) {
          setCooldownSeconds(remaining);
        } else {
          // Clean up expired entry
          localStorage.removeItem(storageKey);
          setCooldownSeconds(0);
        }
      } else {
        setCooldownSeconds(0);
      }

      setIsInitializing(false);
    };

    initializeCooldown();
  }, [email, organizationId, storageKey]);

  // Countdown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0 || isInitializing) return undefined;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          // Clean up localStorage when cooldown expires
          if (email && organizationId) {
            localStorage.removeItem(storageKey);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds, isInitializing, email, organizationId]);

  // Redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = getRedirectUrlFromSearchParams(
        searchParams,
        user,
        false, // isMultiple - could be enhanced if needed
      );
      if (redirectUrl !== '/') {
        router.push(redirectUrl);
      }
    }
  }, [isAuthenticated, user, searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Error',
        description: 'Email is missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await verifyOtp({
        email,
        otp,
        isCandidate: isCandidate || false,
      }).unwrap();

      if (res?.loggedIn && res?.loggedIn === true) {
        toast({ title: 'Success', description: 'Login successful' });

        // Clear cooldown on successful verification
        if (email && organizationId) {
          localStorage.removeItem(storageKey);
        }

        await dispatch(fetchUserFromToken()).unwrap();
      }
    } catch (err) {
      const errorMessage =
        (err as { data?: { message: string } })?.data?.message ||
        'Failed to verify OTP';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Email missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendOtp({
        email,
        organizationId,
        isCandidate: isCandidate || false,
      }).unwrap();

      toast({ title: 'Success', description: 'New OTP sent' });

      // Store timestamp in localStorage
      if (organizationId) {
        localStorage.setItem(storageKey, Date.now().toString());
      }

      setCooldownSeconds(60); // Reset cooldown to 1 minute
    } catch (err) {
      const errorMessage =
        (err as { data?: { message: string } })?.data?.message ||
        'Failed to resend OTP';

      // If rate limited, try to extract remaining time from error response
      const errorStatus = (err as { status?: number })?.status;
      if (errorStatus === 429) {
        const errorData = err as {
          data?: { retryAfter?: number; message?: string };
        };
        const retryAfter = errorData?.data?.retryAfter;

        if (retryAfter && retryAfter > 0) {
          setCooldownSeconds(retryAfter);
          // Store timestamp adjusted for remaining time
          if (organizationId) {
            const adjustedTime = Date.now() - (60 - retryAfter) * 1000;
            localStorage.setItem(storageKey, adjustedTime.toString());
          }
        } else {
          // If no retryAfter provided, set to 60 seconds
          setCooldownSeconds(60);
          if (organizationId) {
            localStorage.setItem(storageKey, Date.now().toString());
          }
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Format countdown timer
  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  function renderResendSection() {
    if (isInitializing) {
      return <p className="text-muted-foreground">Loading...</p>;
    }

    if (cooldownSeconds > 0) {
      return (
        <p>
          Please wait {formatCooldown(cooldownSeconds)} before requesting a new
          OTP
        </p>
      );
    }

    return (
      <Button variant="link" onClick={handleResendOtp} disabled={isLoading}>
        {isSending ? 'Sending...' : 'Resend OTP'}
      </Button>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter OTP</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
          <div className="mt-4 text-center">{renderResendSection()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
