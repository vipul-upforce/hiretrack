"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NextPage } from "next";
import AuthGuardLoading from "./ui/authGuardLoader";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

// In-memory cache for auth state (persists across navigations)
let cachedAuthState: {
  isAuthenticated: boolean;
  userRole: string | null;
  allowance: boolean | null;
} = {
  isAuthenticated: false,
  userRole: null,
  allowance: null,
};

interface AuthGuardOptions {
  requiredRoles?: string[];
  fallbackPath?: string;
  checkAllowance?: boolean;
  allowAuthenticated?: boolean;
}

const withAuthGuard = <P extends object>(
  WrappedComponent: NextPage<P>,
  options: AuthGuardOptions = {}
): NextPage<P> => {
  const {
    requiredRoles = [],
    fallbackPath = "/login",
    checkAllowance = false,
    allowAuthenticated = true,
  } = options;

  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const AuthGuardComponent: NextPage<P> = (props) => {
    const [authState, setAuthState] = useState<
      "loading" | "authorized" | "unauthorized"
    >("loading");
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        // Uses cached auth state if available
        if (cachedAuthState.isAuthenticated && cachedAuthState.userRole) {
          if (!allowAuthenticated) {
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }

          if (
            requiredRoles.length > 0 &&
            !requiredRoles.includes(cachedAuthState.userRole)
          ) {
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }

          if (checkAllowance && cachedAuthState.allowance === null) {
            try {
              const response = await fetch("/api/organization");
              const allowance = await response.json();
              cachedAuthState.allowance = allowance.allow;
              if (!allowance.allow) {
                router.replace(fallbackPath);
                setAuthState("unauthorized");
                return;
              }
            } catch (error) {
              router.replace(fallbackPath);
              setAuthState("unauthorized");
              return;
            }
          } else if (checkAllowance && !cachedAuthState.allowance) {
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }

          setAuthState("authorized");
          return;
        }

        // No cached auth, check token
        const token = Cookies.get("token");
        if (!token) {
          if (!allowAuthenticated) {
            router.replace(fallbackPath);
          }
          setAuthState("unauthorized");
          return;
        }

        const decryptedResponse = await verifyAndDecryptJWTToken(token);
        if (decryptedResponse.success && decryptedResponse.user) {
          cachedAuthState = {
            isAuthenticated: true,
            userRole: decryptedResponse.user.role,
            allowance: null, // Reset allowance to check if needed
          };

          if (!allowAuthenticated) {
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }

          if (
            requiredRoles.length > 0 &&
            !requiredRoles.includes(decryptedResponse.user.role)
          ) {
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }

          if (checkAllowance) {
            try {
              const response = await fetch("/api/organization");
              const allowance = await response.json();
              cachedAuthState.allowance = allowance.allow;
              if (!allowance.allow) {
                router.replace(fallbackPath);
                setAuthState("unauthorized");
                return;
              }
            } catch (error) {
              router.replace(fallbackPath);
              setAuthState("unauthorized");
              return;
            }
          }

          setAuthState("authorized");
        } else {
          cachedAuthState = {
            isAuthenticated: false,
            userRole: null,
            allowance: null,
          };
          router.replace(fallbackPath);
          setAuthState("unauthorized");
        }
      };

      checkAuth();
    }, []); // Empty dependency array to run only once per session

    if (authState === "loading") {
      return <AuthGuardLoading />;
    }

    return authState === "authorized" ? (
      <WrappedComponent {...props} user={{ role: cachedAuthState.userRole }} />
    ) : null;
  };

  AuthGuardComponent.displayName = `withAuthGuard(${displayName})`;

  return AuthGuardComponent;
};

export default withAuthGuard;
