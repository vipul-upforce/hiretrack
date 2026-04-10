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
// import { validateLicense } from '@/lib/licenseUtils';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // const licenseCheck = await validateLicense();

  // if (!licenseCheck.valid) {
  //   // If the license is missing, tampered with, or on the wrong hardware, 
  //   // hijack the entire screen and do NOT render the app providers or children.
  //   return (
  //     <html lang="en">
  //       <body className={`${geistSans.variable} bg-gray-50 flex items-center justify-center min-h-screen p-4`}>
  //         <div className="max-w-lg w-full p-8 bg-white border-t-4 border-red-600 shadow-xl rounded-xl text-center">
  //           <div className="mb-6 flex justify-center">
  //             <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
  //             </svg>
  //           </div>
  //           <h1 className="text-2xl font-bold text-gray-900 mb-2">
  //             Software Locked
  //           </h1>
  //           <div className="p-4 bg-red-50 rounded-lg mb-6">
  //             <p className="text-red-700 font-medium">
  //               {licenseCheck.error}
  //             </p>
  //           </div>
  //           <p className="text-gray-600 text-sm leading-relaxed">
  //             This instance of HireTrack is not authorized to run on this server's hardware.
  //             Please run the installation script to register this machine, or contact support if you believe this is an error.
  //           </p>
  //         </div>
  //       </body>
  //     </html>
  //   );
  // }

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