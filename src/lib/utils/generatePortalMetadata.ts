import type { Metadata } from 'next';

/**
 * Portal metadata structure returned from getPortalMetadata()
 */
export interface PortalMetadata {
  portalName: string;
  portalLogo: { url: string } | null;
  portalFavicon: { url: string } | null;
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Options for customizing metadata generation
 */
export interface GeneratePortalMetadataOptions {
  /** Page-specific title (will be combined with portal name) */
  title?: string;
  /** Page-specific description */
  description?: string;
  /** Override default title template */
  titleTemplate?: string;
  /** Additional Open Graph properties */
  openGraph?: {
    title?: string;
    description?: string;
    type?: 'website' | 'article' | 'profile';
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
  };
  /** Additional Twitter card properties */
  twitter?: {
    title?: string;
    description?: string;
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    images?: string[];
  };
  /** Additional metadata fields */
  additionalMetadata?: Partial<Metadata>;
}

/**
 * Normalizes a portal asset URL to a relative path for metadata.
 * Uses relative paths so the browser resolves them against the current origin
 * (no NEXT_PUBLIC_BASE_URL or localhost fallback needed; safe for multi-tenant).
 * If the stored value is absolute (e.g. legacy localhost URL), strips to path only.
 */
function toRelativeMetadataUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Already relative – use as-is
  if (url.startsWith('/')) return url;

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return undefined;
  }
}

export function generatePortalMetadata(
  portalData: PortalMetadata,
  options: GeneratePortalMetadataOptions = {},
): Metadata {
  // Use relative paths only – browser resolves against current origin.
  // No NEXT_PUBLIC_BASE_URL or localhost fallback (multi-tenant safe).
  const logoUrl = toRelativeMetadataUrl(portalData.portalLogo?.url);
  const faviconUrl = toRelativeMetadataUrl(portalData.portalFavicon?.url);

  // Generate title
  const defaultTitle = portalData.portalName;
  let fullTitle = defaultTitle;
  
  if (options.title) {
    if (options.titleTemplate) {
      fullTitle = options.titleTemplate.replace('%s', options.title);
    } else {
      fullTitle = `${options.title} - ${defaultTitle}`;
    }
  }

  // Generate description
  const defaultDescription = `${portalData.portalName} - Streamline your recruitment process with our modern applicant tracking system.`;
  const description = options.description || defaultDescription;

  // Build metadata object
  const metadata: Metadata = {
    metadataBase: new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
    title: {
      default: defaultTitle,
      template: options.titleTemplate || `%s - ${defaultTitle}`,
      ...(options.title && { absolute: fullTitle }),
    },
    description,
    applicationName: portalData.portalName,
    ...(faviconUrl && {
      icons: {
        icon: [
          { url: faviconUrl, type: 'image/x-icon' },
          { url: faviconUrl, type: 'image/png', sizes: '32x32' },
        ],
        apple: [{ url: faviconUrl, sizes: '180x180', type: 'image/png' }],
        shortcut: faviconUrl,
      },
    }),
    openGraph: {
      title: options.openGraph?.title || fullTitle,
      description: options.openGraph?.description || description,
      siteName: portalData.portalName,
      locale: 'en_US',
      type: options.openGraph?.type || 'website',
      ...(logoUrl && {
        images: options.openGraph?.images || [
          {
            url: logoUrl,
            width: 1200,
            height: 630,
            alt: `${portalData.portalName} Logo`,
          },
        ],
      }),
    },
    twitter: {
      card: options.twitter?.card || 'summary_large_image',
      title: options.twitter?.title || fullTitle,
      description: options.twitter?.description || description,
      ...(logoUrl && {
        images: options.twitter?.images || [logoUrl],
      }),
    },
    // Add theme color for mobile browsers
    // themeColor: [
    //   {
    //     media: '(prefers-color-scheme: light)',
    //     color: portalData.primaryColor,
    //   },
    //   { media: '(prefers-color-scheme: dark)', color: portalData.primaryColor },
    // ],
    // // Add color scheme metadata
    // colorScheme: 'light dark',
    // Merge any additional metadata
    ...options.additionalMetadata,
  };

  return metadata;
}
