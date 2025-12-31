// eslint-disable-next-line camelcase
import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import AuthInitializer from '@/components/AuthInitializer';
import React, { Suspense } from 'react';
import { getPortalMetadata } from '@/lib/getPortalMetadata';
import { generatePortalMetadata } from '@/lib/utils/generatePortalMetadata';
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
  return generatePortalMetadata(portalData, {
    description: `${portalData.portalName} - Streamline your recruitment process with our modern applicant tracking system.`,
  });
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
            // eslint-disable-next-line react/no-danger
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
          <style
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
              :root {
                --portal-primary: #6366f1;
                --portal-secondary: #8b5cf6;
                --portal-primary-rgb: 99, 102, 241;
                --portal-secondary-rgb: 139, 92, 246;
                --portal-primary-hover: #4f46e5;
                --portal-primary-light: #818cf8;
                --portal-secondary-hover: #7c3aed;
                --portal-secondary-light: #a78bfa;
                --focus-ring-color: rgba(99, 102, 241, 0.2);
                --input-border-focus: #6366f1;
              }
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
