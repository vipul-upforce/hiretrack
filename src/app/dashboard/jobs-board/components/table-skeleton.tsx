import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { getRandom } from '@/lib/utils/getRandom';

export function TableSkeleton({
  customFieldColumns = [],
}: {
  customFieldColumns: string[];
}) {
  return (
    <div className="flex h-screen w-full animate-pulse flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-xl font-bold">
              <Skeleton className="h-6 w-40" />
            </CardTitle>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
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
      <div className="flex items-center gap-3 border-b border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-black">
        <div className="flex flex-1 items-center gap-3">
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
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-black/30">
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

              {customFieldColumns.map(() => (
                <th
                  key={getRandom(0, 1000000).toString()}
                  className="px-4 py-3"
                >
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}

              <th className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>

              <th className="px-4 py-3">
                <Skeleton className="ml-auto h-4 w-16" />
              </th>
            </tr>
          </thead>

          {/* TABLE ROWS SKELETON */}
          <tbody>
            {Array.from({ length: 10 }).map(() => (
              <tr
                key={getRandom(0, 1000000).toString()}
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

                {customFieldColumns.map(() => (
                  <td
                    key={`${getRandom(0, 1000000).toString()}`}
                    className="px-4 py-4"
                  >
                    <Skeleton className="h-4 w-20" />
                  </td>
                ))}

                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-20" />
                </td>

                <td className="flex px-4 py-4 text-right">
                  <Skeleton className="ml-auto h-7 w-8" />
                  <Skeleton className="ml-auto h-7 w-8" />
                  <Skeleton className="ml-auto h-7 w-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
