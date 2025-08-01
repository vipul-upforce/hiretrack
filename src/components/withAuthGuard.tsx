"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NextPage } from "next";
import AuthGuardLoading from "./ui/authGuardLoader";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

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
  options: AuthGuardOptions = {}
): NextPage<P> => {
  const {
    requiredRoles = [],
    fallbackPath = "/dashboard",
    checkAllowance = false,
    allowAuthenticated = true,
  } = options;

  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const AuthGuardComponent: NextPage<P> = (props) => {
    const { user, isAuthenticated }: { user: User; isAuthenticated: boolean } =
      useSelector((state: any) => state.auth || {});

    const router = useRouter();
    const pathname = usePathname();

    const getInitialAuthState = () => {
      if (isAuthenticated === undefined) {
        return "loading";
      }

      if (pathname === "/register/org" && checkAllowance) {
        return "loading";
      }

      if (checkAllowance && !isAllowanceCacheValid()) {
        return "loading";
      }

      if (!allowAuthenticated && isAuthenticated) {
        return "unauthorized";
      }

      if (allowAuthenticated && !isAuthenticated) {
        return "unauthorized";
      }

      if (
        isAuthenticated &&
        requiredRoles.length > 0 &&
        (!user?.role || !requiredRoles.includes(user.role))
      ) {
        return "unauthorized";
      }

      return "authorized";
    };
    const [authState, setAuthState] = useState<
      "loading" | "authorized" | "unauthorized"
    >(getInitialAuthState);
    const isCheckingAllowance = useRef(false);
    const hasInitialized = useRef(false);

    console.log("AuthGuard - Redux state:", {
      isAuthenticated,
      user: user?.id,
      role: user?.role,
    });

    const isAllowanceCacheValid = useCallback(() => {
      const currentUserId = user?.id || null;
      return (
        allowanceCache.value !== null &&
        allowanceCache.timestamp !== null &&
        allowanceCache.userId === currentUserId &&
        Date.now() - allowanceCache.timestamp < CACHE_DURATION
      );
    }, [user?.id]);

    const fetchAllowance = useCallback(async (): Promise<boolean> => {
      const currentUserId = user?.id || null;

      if (isAllowanceCacheValid()) {
        console.log("Using cached allowance:", allowanceCache.value);
        return allowanceCache.value!;
      }

      if (isCheckingAllowance.current) {
        console.log("Allowance check already in progress");
        return allowanceCache.value ?? false;
      }

      isCheckingAllowance.current = true;

      try {
        console.log("Fetching fresh allowance data...");
        const response = await fetch("/api/organization");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const allowanceData = await response.json();

        // Update cache
        allowanceCache = {
          value: allowanceData.allow,
          timestamp: Date.now(),
          userId: currentUserId,
        };

        console.log("Allowance cached:", allowanceData.allow);
        return allowanceData.allow;
      } catch (error) {
        console.error("Allowance check failed:", error);
        return false;
      } finally {
        isCheckingAllowance.current = false;
      }
    }, [user?.id, isAllowanceCacheValid]);

    const performAuthCheck = useCallback(async () => {
      console.log("Performing auth check...");

      try {
        if (pathname === "/register/org") {
          if (checkAllowance) {
            const hasAllowance = await fetchAllowance();
            if (!hasAllowance) {
              console.log("No allowance - redirecting");
              router.replace(fallbackPath);
              setAuthState("unauthorized");
              return;
            }
          }
          setAuthState("authorized");
          return;
        }

        console.log("Checking auth state from Redux:", {
          isAuthenticated,
          userId: user?.id,
        });

        if (checkAllowance) {
          const hasAllowance = await fetchAllowance();
          if (!hasAllowance) {
            console.log("No allowance - redirecting");
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }
        }

        if (!allowAuthenticated && isAuthenticated) {
          console.log("Route doesn't allow authenticated users - redirecting");
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        if (allowAuthenticated && !isAuthenticated) {
          console.log(
            "Authentication required but user not authenticated - redirecting"
          );
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        if (
          isAuthenticated &&
          requiredRoles.length > 0 &&
          (!user?.role || !requiredRoles.includes(user.role))
        ) {
          console.log(
            "User role not authorized:",
            user?.role,
            "Required:",
            requiredRoles
          );
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        console.log("Authorization successful");
        setAuthState("authorized");
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState("unauthorized");
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
        console.log("Still loading auth state from Redux...");
        setAuthState("loading");
        return;
      }

      if (authState !== "loading" && !checkAllowance) {
        return;
      }

      performAuthCheck();
      hasInitialized.current = true;
    }, [pathname, isAuthenticated, user?.id, user?.role, performAuthCheck]);

    useEffect(() => {
      const currentUserId = user?.id || null;
      if (allowanceCache.userId && allowanceCache.userId !== currentUserId) {
        console.log("User changed - clearing allowance cache");
        allowanceCache = {
          value: null,
          timestamp: null,
          userId: null,
        };
      }
    }, [user?.id]);

    if (authState === "loading") {
      return <AuthGuardLoading />;
    }

    return authState === "authorized" ? (
      <WrappedComponent {...props} user={{ role: user?.role || null }} />
    ) : null;
  };

  AuthGuardComponent.displayName = `withAuthGuard(${displayName})`;

  return AuthGuardComponent;
};

export default withAuthGuard;
