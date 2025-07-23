"use client";
import { useEffect, useState } from "react";
import { IUser } from "@/lib/models/user";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [uriOrgName, setOrgName] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);

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

  useEffect(() => {
    // Only update DOM after hydration is complete
    if (!isHydrated) return;

    // Update document title
    const title = uriOrgName || user?.organizationInfo?.name || "Hiretrack";
    document.title = title;

    // Update favicon
    const favicon =
      user?.organizationInfo?.name || uriOrgName
        ? `/api/files?pathName=../assets/organizations/${uriOrgName || user?.organizationInfo?.name}/favicon.png`
        : "/favicon.png";

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      link.href = favicon;
    }
  }, [user, uriOrgName, isHydrated]);

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

  // Don't render children until hydration is complete to prevent mismatches
  if (!isHydrated) {
    return <div suppressHydrationWarning />;
  }

  return <div suppressHydrationWarning>{children}</div>;
}
