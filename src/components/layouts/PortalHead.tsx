"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { IUser } from "@/lib/models/user";

interface PortalHeadProps {
  portalName?: string;
  portalLogo?: string;
  isLoading?: boolean;
}

export default function PortalHead({
  portalName = "HireTrack",
  portalLogo = "/default/favicon.png",
  isLoading = false,
}: PortalHeadProps) {
  const [user, setUser] = useState<IUser | null>(null);
  // debugger;
  // Get user from cookies when component mounts
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
  // console.log("PortalHead render:", { portalName, portalLogo, isLoading });
  // console.log("PortalHead Head component output:", {
  //   title: isLoading ? "" : portalName,
  //   favicon: portalLogo || null,
  // });

  return (
    <Head>
      <title>{isLoading ? "Hiretrack" : portalName}</title>
      <link
        rel="icon"
        href={portalLogo || `/${user?.organizationInfo?.name}/favicon.png`}
      />
    </Head>
  );
}
