'use client';

import { useEffect } from 'react';
import { useGetPortalConfigsQuery } from '@/lib/features/settings';
import logger from '@/lib/logger';

/**
 * Converts hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Darkens a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, rgb.r + amt));
  const g = Math.max(0, Math.min(255, rgb.g + amt));
  const b = Math.max(0, Math.min(255, rgb.b + amt));
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Lightens a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, rgb.r - amt));
  const g = Math.min(255, Math.max(0, rgb.g - amt));
  const b = Math.min(255, Math.max(0, rgb.b - amt));
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Hook to sync portal metadata (title, favicon, colors) with document
 * Updates document title, favicon, and CSS variables when portal config changes
 *
 * @param options - Configuration options
 * @param options.skip - Skip the query (useful for conditional fetching)
 * @param options.titleOverride - Override the document title (defaults to portalName)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   usePortalMetadataSync();
 *   return <div>Content</div>;
 * }
 * ```
 */
export function usePortalMetadataSync(options?: {
  skip?: boolean;
  titleOverride?: string;
}) {
  const {
    data: portalConfig,
    isLoading,
    error,
  } = useGetPortalConfigsQuery(undefined, { skip: options?.skip });

  // Update document title and favicon
  useEffect(() => {
    if (!portalConfig || isLoading) return;

    try {
      // Update document title
      const title =
        options?.titleOverride || portalConfig.portalName || 'HireTrack';
      document.title = title;

      // Update favicon
      if (portalConfig.portalFavicon?.url) {
        const favicon = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement;
        if (favicon) {
          favicon.href = portalConfig.portalFavicon.url;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = portalConfig.portalFavicon.url;
          document.head.appendChild(newFavicon);
        }

        // Update apple-touch-icon for iOS devices
        let touchIcon = document.querySelector(
          "link[rel~='apple-touch-icon']",
        ) as HTMLLinkElement;
        if (!touchIcon) {
          touchIcon = document.createElement('link');
          touchIcon.rel = 'apple-touch-icon';
          document.head.appendChild(touchIcon);
        }
        touchIcon.href = portalConfig.portalFavicon.url;
      }

      // Update theme color meta tag
      if (portalConfig.primaryColor) {
        let themeColorMeta = document.querySelector(
          'meta[name="theme-color"]',
        ) as HTMLMetaElement;
        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.name = 'theme-color';
          document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.content = portalConfig.primaryColor;
      }
    } catch (err) {
      logger.error('Error updating document metadata:', err);
    }
  }, [portalConfig, isLoading, options?.titleOverride]);

  // Update CSS variables for colors
  useEffect(() => {
    if (!portalConfig || isLoading || error) return;

    try {
      const root = document.documentElement;

      // Set primary color variables
      if (portalConfig.primaryColor) {
        root.style.setProperty('--portal-primary', portalConfig.primaryColor);

        const primaryRgb = hexToRgb(portalConfig.primaryColor);
        if (primaryRgb) {
          root.style.setProperty(
            '--portal-primary-rgb',
            `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
          );
          root.style.setProperty(
            '--portal-primary-hover',
            darkenColor(portalConfig.primaryColor, 10),
          );
          root.style.setProperty(
            '--portal-primary-light',
            lightenColor(portalConfig.primaryColor, 10),
          );
          root.style.setProperty(
            '--focus-ring-color',
            `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`,
          );
          root.style.setProperty(
            '--input-border-focus',
            portalConfig.primaryColor,
          );
        }
      }

      // Set secondary color variables
      if (portalConfig.secondaryColor) {
        root.style.setProperty(
          '--portal-secondary',
          portalConfig.secondaryColor,
        );

        const secondaryRgb = hexToRgb(portalConfig.secondaryColor);
        if (secondaryRgb) {
          root.style.setProperty(
            '--portal-secondary-rgb',
            `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`,
          );
          root.style.setProperty(
            '--portal-secondary-hover',
            darkenColor(portalConfig.secondaryColor, 10),
          );
          root.style.setProperty(
            '--portal-secondary-light',
            lightenColor(portalConfig.secondaryColor, 10),
          );
        }
      }
    } catch (err) {
      logger.error('Error updating CSS variables:', err);
    }
  }, [portalConfig, isLoading, error]);

  return {
    portalConfig,
    isLoading,
    error,
  };
}
