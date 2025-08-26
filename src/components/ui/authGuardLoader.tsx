"use client";

import { useEffect, useState } from "react";
import { Shield, Lock } from "lucide-react";

export const AuthGuardLoading = () => {
  const [loadingDots, setLoadingDots] = useState("");

  // Animate the loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center max-w-md mx-auto p-8 rounded-xl">
        <div className="relative mb-6">
          {/* Shield background with pulse effect */}
          <div className="absolute inset-0 rounded-full bg-blue-100 dark:bg-blue-900/20 animate-pulse" />

          {/* Shield icon container */}
          <div className="relative bg-white dark:bg-black rounded-full p-5 shadow-lg">
            <Shield className="w-12 h-12 text-blue-500 dark:text-blue-400" />

            {/* Rotating lock animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="animate-pulse">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-progress" />
        </div>

        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Verifying Access
        </h3>

        <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
          Checking permissions{loadingDots}
        </p>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          This will only take a moment
        </p>
      </div>
    </div>
  );
};

export default AuthGuardLoading;
