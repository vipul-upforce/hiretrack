"use client";
import { useEffect, useState } from "react";
import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";

import { useSelector } from "react-redux";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSelector((state: any) => state.auth || {});
  const [uriOrgName, setOrgName] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);

  const {
    data: portalSettings,
    isLoading,
    isError,
    error
  } = useGetPortalConfigsQuery(undefined, { skip: !isHydrated });

  // Handle hydration completion
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const orgname = window.location.href.split("=")[1];
      setOrgName(orgname);
    }
  }, []);

  // Fetch portal settings for favicon and title
  // useEffect(() => {
  //   if (!isHydrated) return;

  //   // const title =
  //   //   portalSettings?.portalName ||
  //   //   uriOrgName ||
  //   //   user?.organizationInfo?.name ||
  //   //   "HireTrack";
  //   // document.title = title;

  //   const faviconUrl = portalSettings?.portalFavicon?.url || "/favicon.png";
  //   let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;

  //   if (favicon) {
  //     favicon.href = faviconUrl;
  //   } else {
  //     // create a new favicon if it doesn't exist
  //     const newFavicon = document.createElement("link");
  //     newFavicon.rel = "icon";
  //     newFavicon.href = faviconUrl;
  //     document.head.appendChild(newFavicon);
  //   }
  // }, [portalSettings, uriOrgName, user, isHydrated]);

  // Handle browser extension interference
  useEffect(() => {
    if (!isHydrated) return;

    // Remove any attributes added by browser extensions that might cause hydration issues
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Remove common browser extension attributes that cause hydration mismatches
    const extensionAttributes = [
      "data-arp",
      "data-new-gr-c-s-check-loaded",
      "data-gr-ext-installed",
      "data-grammarly-shadow-root",
      "data-grammarly-shadow-root-version",
    ];

    extensionAttributes.forEach((attr) => {
      if (htmlElement.hasAttribute(attr)) {
        htmlElement.removeAttribute(attr);
      }
      if (bodyElement.hasAttribute(attr)) {
        bodyElement.removeAttribute(attr);
      }
    });
  }, [isHydrated]);

  // Don't render children until hydration is complete to prevent mismatches or the data is loading
  if (!isHydrated || isLoading) {
    return <div suppressHydrationWarning />;
  }

  // // if there is an error then fallback to default info.
  // if (isError) {

  //   console.log("Failed to fetch portal settings : ", error)

  //   document.title = uriOrgName || user?.organizationInfo?.name || "HireTrack";
  //   const favicon = document.querySelector(
  //     'link[rel="icon"]'
  //   ) as HTMLLinkElement;
  //   if (favicon) {
  //     favicon.href = "/favicon.png";
  //   }
  // }


  return <div suppressHydrationWarning>{children}</div>;
}
