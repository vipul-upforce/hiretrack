"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const checkUser = async () => {
    const token = Cookies.get("token");
    if (token) {
      const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
      if (decryptedResponse.success && decryptedResponse.user) {
        if (decryptedResponse.user.role !== "admin") {
          debugger;
          router.push("/dashboard");
        }
      }
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return <>{children}</>;
}
