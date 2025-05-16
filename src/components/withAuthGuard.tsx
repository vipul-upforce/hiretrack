// src/components/withAuthGuard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NextPage } from "next";
import { useAuth } from "@/app/hooks/useAuth";
import AuthGuardLoading from "./ui/authGuardLoader";

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
    const { isAuthenticated, userRole } = useAuth();

    useEffect(() => {
      const checkAuthorization = async () => {
        // console.log("CHECKING AUTH...", { isAuthenticated, userRole });

        // Check allowance if required
        if (checkAllowance) {
          try {
            const response = await fetch("/api/organization");
            const allowance = await response.json();
            // console.log("ALLOWANCE CHECK:", allowance);
            if (!allowance.allow) {
              // console.log(
              //   "REDIRECTING: Allowance check failed, redirecting to",
              //   fallbackPath
              // );
              router.replace(fallbackPath);
              setAuthState("unauthorized");
              return;
            }
          } catch (error) {
            console.error("Allowance check failed:", error);
            // console.log(
            //   "REDIRECTING: Allowance check error, redirecting to",
            //   fallbackPath
            // );
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }
        }

        // If authenticated users are not allowed
        if (!allowAuthenticated && isAuthenticated) {
          // console.log(
          //   "REDIRECTING: Authenticated user not allowed, redirecting to",
          //   fallbackPath
          // );
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        if (!isAuthenticated && !checkAllowance) {
          // console.log(
          //   "REDIRECTING: User not authenticated, redirecting to",
          //   fallbackPath
          // );
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        if (requiredRoles.length > 0 && userRole) {
          if (!requiredRoles.includes(userRole)) {
            // console.log(
            //   "REDIRECTING: Role check failed, redirecting to",
            //   fallbackPath
            // );
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }
        }

        // console.log("AUTHORIZED: User passed all checks");
        setAuthState("authorized");
      };

      checkAuthorization();
    }, [
      isAuthenticated,
      userRole,
      router,
      fallbackPath,
      requiredRoles,
      checkAllowance,
      allowAuthenticated,
    ]);

    // console.log("RENDERING AUTH STATE:", authState);

    if (authState === "loading") {
      return <AuthGuardLoading />;
    }

    return authState === "authorized" ? <WrappedComponent {...props} /> : null;
  };

  AuthGuardComponent.displayName = `withAuthGuard(${displayName})`;

  return AuthGuardComponent;
};

export default withAuthGuard;
