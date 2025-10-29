import React, { memo, useState, useEffect, useMemo } from "react";

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
  ({ portalLogo, portalLogoDark, portalName, theme, isLoading }: SidebarLogoProps) => {
    const [imageError, setImageError] = useState(false);

    // Memoize logo URL calculation to prevent recalculation on every render
    const logoUrl = useMemo(() => {
      if (theme === "dark" && portalLogoDark) {
        return portalLogoDark;
      } else if (portalLogo) {
        return portalLogo;
      }
      // Fallback to default logos
      return theme === "dark" ? "/logo_dark.png" : "/logo.png";
    }, [theme, portalLogo, portalLogoDark]);

    // Reset error state when URL changes
    useEffect(() => {
      setImageError(false);
    }, [logoUrl]);

    // Show loading spinner
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
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
    const displayUrl = imageError
      ? theme === "dark"
        ? "/logo_dark.png"
        : "/logo.png"
      : logoUrl;

    return (
      <img
        src={displayUrl}
        alt={portalName || "Dashboard Logo"}
        className="object-contain rounded h-8 w-auto max-w-[180px]"
        loading="eager"
        onError={handleImageError}
        draggable={false}
      />
    );
  },
  // Custom comparison function - only re-render if these specific props change
  (prevProps, nextProps) => {
    return (
      prevProps.portalLogo === nextProps.portalLogo &&
      prevProps.portalLogoDark === nextProps.portalLogoDark &&
      prevProps.theme === nextProps.theme &&
      prevProps.isLoading === nextProps.isLoading
    );
  }
);

SidebarLogo.displayName = "SidebarLogo";

export default SidebarLogo;
