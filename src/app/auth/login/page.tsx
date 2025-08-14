"use client";

import { Suspense } from "react";
import LoginFormContent from "./LoginFormContent";

export default function Login() {
  return (
    <Suspense fallback={<div>Loading login form...</div>}>
      <LoginFormContent showCompanyField={false} />
    </Suspense>
  );
}
