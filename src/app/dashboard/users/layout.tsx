"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const checkUser = async () => {
    if (user) {
      if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return <>{children}</>;
}
