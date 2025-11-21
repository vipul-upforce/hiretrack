"use client";

import Head from "next/head";
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
  const { theme } = useTheme();

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
