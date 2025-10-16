import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClientLayout } from "./client-layout";
import AuthInitializer from "@/components/AuthInitializer";
import { Suspense } from "react";
import LoadingScreen from "./loading-screen";
import { pageMetaData } from "@/lib/services/pageMetaData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export async function generateMetadata() {
  return await pageMetaData();
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
