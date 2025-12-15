import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export function TableSkeleton({ customFieldColumns = [] }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden w-full animate-pulse">
      {/* HEADER */}
      <div className="flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            <CardTitle className="text-xl font-bold">
              <Skeleton className="h-6 w-40" />
            </CardTitle>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-md" />
                <Skeleton className="h-8 w-48 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-md" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-t border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-8 w-1/3 rounded-md" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="h-8 w-10 rounded-md" />
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full table-fixed border-collapse rounded-xl">
          {/* TABLE HEADER SKELETON */}
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/30">
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>

              {customFieldColumns.map((field, idx) => (
                <th key={idx} className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}

              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>

              <th className="px-4 py-3">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
            </tr>
          </thead>

          {/* TABLE ROWS SKELETON */}
          <tbody>
            {Array.from({ length: 10 }).map((_, row) => (
              <tr
                key={row}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-10" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>

                {customFieldColumns.map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                ))}

                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-20" />
                </td>

                <td className="px-4 py-4 text-right flex">
                  <Skeleton className="h-7 w-8 ml-auto" />
                  <Skeleton className="h-7 w-8 ml-auto" />
                  <Skeleton className="h-7 w-8 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
