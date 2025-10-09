"use client";

import { Suspense } from "react";
import LoginFormContent from "./LoginFormContent";
import LoadingScreen from "@/app/loading-screen";

export default function Login() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginFormContent showCompanyField={false} />
    </Suspense>
  );
}
