'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import { usePortalMetadataSync } from '@/lib/hooks/usePortalMetadataSync';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAppSelector((state) => state.auth || {});
  const [uriOrgName, setOrgName] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();

  // Use the portal metadata sync hook to handle title, favicon, and colors
  const { portalConfig, isLoading, error } = usePortalMetadataSync({
    skip: !isHydrated,
  });

  // Handle hydration completion
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const orgname = window.location.href.split('=')[1];
      setOrgName(orgname);
    }
  }, []);

  // Fallback title if portal config is not available
  useEffect(() => {
    if (!isHydrated || isLoading || portalConfig) return;

    const fallbackTitle =
      uriOrgName || user?.organizationInfo?.name || 'HireTrack';
    if (document.title === 'HireTrack' || !document.title) {
      document.title = fallbackTitle;
    }
  }, [isHydrated, isLoading, portalConfig, uriOrgName, user]);

  // Handle browser extension interference
  useEffect(() => {
    if (!isHydrated) return;

    // Remove any attributes added by browser extensions that might cause hydration issues
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Remove common browser extension attributes that cause hydration mismatches
    const extensionAttributes = [
      'data-arp',
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed',
      'data-grammarly-shadow-root',
      'data-grammarly-shadow-root-version',
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

  // if there is an error then fallback to default info.
  if (error) {
    logger.error('Failed to fetch portal settings : ', error);

    const fallbackTitle =
      uriOrgName || user?.organizationInfo?.name || 'HireTrack';
    document.title = fallbackTitle;
    const favicon = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement;
    if (favicon) {
      favicon.href = '/favicon.png';
    }
  }

  return <div suppressHydrationWarning>{children}</div>;
}
