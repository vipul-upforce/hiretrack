"use client";

import { Suspense } from "react";
import ModernLoginComponent from "@/components/auth/ModernLoginComponent";

export default function Login() {
  return (
    <Suspense fallback={<div>Loading login form...</div>}>
      <ModernLoginComponent showCompanyField={false} />
    </Suspense>
  );
}
