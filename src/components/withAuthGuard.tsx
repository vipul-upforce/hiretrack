"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NextPage } from "next";
import AuthGuardLoading from "./ui/authGuardLoader";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

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
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isTokenChecked, setIsTokenChecked] = useState<boolean>(false);

    const getUser = async () => {
      const userData = Cookies.get("token");
      if (userData) {
        const decryptedResponse = await verifyAndDecryptJWTToken(
          String(userData)
        );
        if (decryptedResponse.success && decryptedResponse.user) {
          setIsAuthenticated(true);
          setUserRole(decryptedResponse.user.role);
        }
      } else {
        console.log("HOC: No token found");
      }
      setIsTokenChecked(true); // Mark token check as complete
    };

    useEffect(() => {
      getUser();
    }, []);

    useEffect(() => {
      const checkAuthorization = async () => {
        if (!isTokenChecked) {
          return;
        }

        if (checkAllowance) {
          try {
            const response = await fetch("/api/organization");
            const allowance = await response.json();
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

        if (!allowAuthenticated && isAuthenticated) {
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        if (!isAuthenticated && !checkAllowance) {
          router.replace(fallbackPath);
          setAuthState("unauthorized");
          return;
        }

        if (requiredRoles.length > 0 && userRole) {
          if (!requiredRoles.includes(userRole)) {
            router.replace(fallbackPath);
            setAuthState("unauthorized");
            return;
          }
        }

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
      isTokenChecked,
    ]);

    console.log("HOC: Rendering auth state:", authState);

    if (authState === "loading") {
      return <AuthGuardLoading />;
    }

    return authState === "authorized" ? <WrappedComponent {...props} /> : null;
  };

  AuthGuardComponent.displayName = `withAuthGuard(${displayName})`;

  return AuthGuardComponent;
};

export default withAuthGuard;
