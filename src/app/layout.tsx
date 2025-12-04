import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import AuthInitializer from '@/components/AuthInitializer';
import { Suspense } from 'react';
import { getPortalMetadata } from '@/lib/getPortalMetadata';
import { Providers } from './providers';
import { ClientLayout } from './client-layout';
import LoadingScreen from './loading-screen';

// Force dynamic to ensure fresh metadata on each page load
// getPortalMetadata() uses Next.js unstable_cache with revalidate=0 to fetch fresh data
// while still deduplicating concurrent requests within the same request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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

  const title = portalData.portalName;
  const description = `${portalData.portalName} - Streamline your recruitment process with our modern applicant tracking system.`;

  return {
    title: {
      default: title,
      template: `%s - ${title}`,
    },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.png" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('hiretrack-theme') || 'light';
                  var root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(theme);
                  root.setAttribute('data-theme', theme);
                } catch (e) {
                  console.warn('Failed to initialize theme:', e);
                }
              })();
            `,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <Providers>
            <AuthInitializer />
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </body>
      </html>
    </Suspense>
  );
}
