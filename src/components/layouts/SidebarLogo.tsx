import React, { memo, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface SidebarLogoProps {
  portalLogo?: string;
  portalLogoDark?: string;
  portalName?: string;
  theme: string;
  isLoading?: boolean;
}

/**
 * Memoized Logo component that only re-renders when the logo URL actually changes
 * This prevents flickering during page navigation and notification polling
 */
const SidebarLogo = memo(
  ({
    portalLogo,
    portalLogoDark,
    portalName,
    theme,
    isLoading,
  }: SidebarLogoProps) => {
    const [imageError, setImageError] = useState(false);

    // Memoize logo URL calculation to prevent recalculation on every render
    const logoUrl = useMemo(() => {
      if (theme === 'dark' && portalLogoDark) {
        return portalLogoDark;
      }
      if (portalLogo) {
        return portalLogo;
      }
      // Fallback to default logos
      return theme === 'dark' ? '/logo_dark.png' : '/logo.png';
    }, [theme, portalLogo, portalLogoDark]);

    // Reset error state when URL changes
    useEffect(() => {
      setImageError(false);
    }, [logoUrl]);

    // Show loading spinner
    if (isLoading) {
      return (
        <div className="flex h-8 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    // Handle image error by falling back to default logo
    const handleImageError = () => {
      if (!imageError) {
        setImageError(true);
      }
    };

    // If image error occurred, show fallback logo
    let displayUrl = logoUrl;
    if (imageError) {
      displayUrl = theme === 'dark' ? '/logo_dark.png' : '/logo.png';
    }

    return (
      <div className="relative h-8 w-[180px]">
        <Image
          src={displayUrl}
          alt={portalName || 'Dashboard Logo'}
          fill
          className="rounded object-contain"
          onError={handleImageError}
          unoptimized={displayUrl.startsWith('http')}
        />
      </div>
    );
  },
  // Custom comparison function - only re-render if these specific props change
  (prevProps, nextProps) =>
    prevProps.portalLogo === nextProps.portalLogo &&
    prevProps.portalLogoDark === nextProps.portalLogoDark &&
    prevProps.theme === nextProps.theme &&
    prevProps.isLoading === nextProps.isLoading,
);

SidebarLogo.displayName = 'SidebarLogo';

export default SidebarLogo;
