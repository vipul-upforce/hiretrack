"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { useEffect, useState } from "react";
import { IUser } from "@/lib/models/user";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// export const metadata = {
//   title: "Hiretrack",
//   description: "Hiring management system",
//   icons: {
//     icon: "/favicon.png",
//     shortcut: "/favicon.png",
//     apple: "/favicon.png",
//     other: {
//       rel: "icon",
//       url: "/favicon.png",
//     },
//   },
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<IUser | null>(null);
  const [uriOrgName, setOrgName] = useState<string>();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const orgname = window.location.href.split("=")[1];
      setOrgName(orgname);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const user = Cookies.get("token");
      if (user) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  return (
    <html lang="en">
      <head>
        <title>
          {uriOrgName || user?.organizationInfo?.name || "Hiretrack"}
        </title>
        <link
          rel="icon"
          href={
            user?.organizationInfo?.name || uriOrgName
              ? `/api/files?pathName=../assets/organizations/${uriOrgName || user?.organizationInfo?.name}/favicon.png`
              : "/favicon.png"
          }
        />
      </head>
      {/* <PortalHead /> */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
