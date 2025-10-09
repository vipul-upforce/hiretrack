"use client";

import UniqueLoading from "./morph-loading";

export const AuthGuardLoading = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center max-w-md mx-auto p-8 rounded-xl">
        <UniqueLoading variant="morph" size="lg" />

        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-6">
          Verifying Access
        </h3>

        <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
          Checking permissions...
        </p>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          This will only take a moment
        </p>
      </div>
    </div>
  );
};

export default AuthGuardLoading;
