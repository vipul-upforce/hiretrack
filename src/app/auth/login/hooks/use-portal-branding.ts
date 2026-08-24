import { useState, useEffect } from 'react';
import { useGetPortalConfigsQuery } from '@/lib/features/settings';
import { useTheme } from '@/components/theme-provider';
import logger from '@/lib/logger';
import { BrandingConfig } from '../types';

export function usePortalBranding() {
  const { theme } = useTheme();
  const {
    data: portalConfig,
    isLoading,
    error,
  } = useGetPortalConfigsQuery(undefined);

  const [branding, setBranding] = useState<BrandingConfig>({
    portalName: '',
    logoUrl: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  });

  const [portalError, setPortalError] = useState(false);

  useEffect(() => {
    if (!portalConfig) return;

    try {
      let logoUrl = '';
      const darkLogo = portalConfig.portalLogoDark?.url;
      const lightLogo = portalConfig.portalLogo?.url;
      const defaultLogo = theme === 'dark' ? '/logo_dark.png' : '/logo.png';

      if (theme === 'dark' && darkLogo) logoUrl = darkLogo;
      else if (lightLogo) logoUrl = lightLogo;
      else logoUrl = defaultLogo;

      // Favicon handling
      if (portalConfig.portalFavicon?.url) {
        const favicon = document.querySelector(
          "link[rel*='icon']",
        ) as HTMLLinkElement;
        if (favicon) {
          favicon.href = portalConfig.portalFavicon.url;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = portalConfig.portalFavicon.url;
          document.head.appendChild(newFavicon);
        }
      }

      setBranding({
        portalName: portalConfig.portalName || 'HireTrack',
        logoUrl,
        primaryColor: portalConfig.primaryColor || '#6366f1',
        secondaryColor: portalConfig.secondaryColor || '#8b5cf6',
      });

      if (portalConfig.portalName) {
        document.title = portalConfig.portalName;
      }
    } catch (err) {
      logger.error('Error applying portal settings:', err);
      setPortalError(true);
      document.title = 'HireTrack';
    }
  }, [portalConfig, theme]);

  // Apply CSS variables
  useEffect(() => {
    if (!portalError && !isLoading) {
      document.documentElement.style.setProperty(
        '--portal-primary',
        branding.primaryColor,
      );
      document.documentElement.style.setProperty(
        '--portal-secondary',
        branding.secondaryColor,
      );
    }
  }, [branding.primaryColor, branding.secondaryColor, portalError, isLoading]);

  return { branding, isLoading, error: error || portalError };
}
