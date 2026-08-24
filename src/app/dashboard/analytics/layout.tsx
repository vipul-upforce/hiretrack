import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title */}
            <CardTitle className="line-clamp-2 md:mr-2 text-xl font-bold">
              Analytics & Reports
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
