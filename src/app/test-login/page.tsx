"use client";

import ModernLoginComponent from "@/components/auth/ModernLoginComponent";

export default function TestLoginPage() {
  return (
    <div className="min-h-screen">
      <ModernLoginComponent showCompanyField={false} />
    </div>
  );
}
