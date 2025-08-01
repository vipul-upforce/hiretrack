"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import { fetchUserFromToken } from "@/lib/redux/authSlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/redux/store";

export default function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const email = searchParams?.get("email");
  const organizationId = searchParams?.get("orgId");
  const dispatch = useDispatch<AppDispatch>();

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
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/2fa/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (response.ok) {
        const { user } = await response.json();
        dispatch(fetchUserFromToken());
        // Cookies.set("token", user, { expires: 30 });
        toast({ title: "Success", description: "Login successful" });
        router.push("/dashboard");
      } else {
        const { message } = await response.json();
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email missing",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationId }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "New OTP sent" });
        setCooldownSeconds(60); // Reset cooldown to 1 minute
      } else {
        const { message } = await response.json();
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format countdown timer
  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
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
              {isLoading ? "Verifying..." : "Verify"}
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
                Resend OTP
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
