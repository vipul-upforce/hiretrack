"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { IUser } from "@/lib/models/user";
import { useTheme } from "@/components/theme-provider";

interface PortalHeadProps {
  portalName?: string;
  portalLogo?: string;
  isLoading?: boolean;
}

export default function PortalHead({
  portalName = "HireTrack",
  portalLogo = "/default/favicon.png",
  isLoading = false,
}: PortalHeadProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const { theme } = useTheme();

  // Get user from cookies when component mounts
  useEffect(() => {
    (async () => {
      const user = Cookies.get("token");
      if (user) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  // Determine which logo to use
  const getLogoUrl = () => {
    // If user has set a custom logo, use it
    if (portalLogo && portalLogo !== "/default/favicon.png") {
      return portalLogo;
    }

    // Otherwise use default logos based on theme
    return theme === "dark" ? "/logo_dark.png" : "/logo.png";
  };

  return (
    <Head>
      <title>{isLoading ? "Hiretrack" : portalName}</title>
      <link rel="icon" href={getLogoUrl()} />
    </Head>
  );
}
