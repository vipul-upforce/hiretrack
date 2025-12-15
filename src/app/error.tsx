'use client';

import logger from '@/lib/logger';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        Something went wrong!
      </h2>

      {/* Displaying the error message safely */}
      <div className="mb-6 max-w-md rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
        <p className="font-medium">Error Details:</p>
        <p className="mt-1 font-mono">
          {error.message || 'Unknown error occurred'}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs opacity-70">Digest: {error.digest}</p>
        )}
      </div>

      <button
        type="button"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
    </div>
  );
}
