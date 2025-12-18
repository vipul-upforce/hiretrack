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

export default function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  const email = searchParams?.get('email');
  const organizationId = searchParams?.get('orgId');
  const dispatch = useDispatch<AppDispatch>();

  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isSending }] = useSendOtpMutation();

  const isLoading = isVerifying || isSending;

  // Countdown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

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
      await verifyOtp({ email, otp }).unwrap();

      toast({ title: 'Success', description: 'Login successful' });

      dispatch(fetchUserFromToken());

      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to verify OTP';
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
      await sendOtp({ email, organizationId }).unwrap();

      toast({ title: 'Success', description: 'New OTP sent' });
      setCooldownSeconds(60); // Reset cooldown to 1 minute
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to resend OTP';
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
          <div className="mt-4 text-center">
            {cooldownSeconds > 0 ? (
              <p>
                Please wait {formatCooldown(cooldownSeconds)} before requesting
                a new OTP
              </p>
            ) : (
              <Button
                variant="link"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                {isSending ? 'Sending...' : 'Resend OTP'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
