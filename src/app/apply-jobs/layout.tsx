import { Metadata } from 'next';
import { getPortalMetadata } from '@/lib/getPortalMetadata';
import React from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const portalData = await getPortalMetadata();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Construct absolute URLs for images
  const logoUrl = portalData.portalLogo?.url
    ? `${baseUrl}${portalData.portalLogo.url}`
    : undefined;
  const faviconUrl = portalData.portalFavicon?.url
    ? `${baseUrl}${portalData.portalFavicon.url}`
    : undefined;

  const title = `Careers - ${portalData.portalName}`;
  const description = `Explore exciting career opportunities at ${portalData.portalName}. Apply to open positions and join our team.`;

  return {
    title: 'Careers',
    description,
    openGraph: {
      title,
      description,
      siteName: portalData.portalName,
      locale: 'en_US',
      type: 'website',
      ...(logoUrl && {
        images: [
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
      card: 'summary_large_image',
      title,
      description,
      ...(logoUrl && {
        images: [logoUrl],
      }),
    },
    ...(faviconUrl && {
      icons: {
        icon: faviconUrl,
        apple: faviconUrl,
      },
    }),
  };
}

export default function ApplyJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
