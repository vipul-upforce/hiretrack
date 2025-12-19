import { TableHead, TableRow } from '@/components/ui/table';

/**
 * Header row component for logs table
 */
export function LogsTableHeader() {
  return (
    <TableRow className="border-gray-200 dark:border-gray-700">
      <TableHead className="w-[150px] p-2 text-left font-bold text-gray-900 dark:text-gray-100">
        Updated At
      </TableHead>
      <TableHead className="w-[150px] p-2 text-left font-bold text-gray-900 dark:text-gray-100">
        Fields Updated
      </TableHead>
      <TableHead className="w-[200px] p-2 text-left font-bold text-gray-900 dark:text-gray-100">
        Previous
      </TableHead>
      <TableHead className="w-[200px] p-2 text-left font-bold text-gray-900 dark:text-gray-100">
        Updated
      </TableHead>
      <TableHead className="w-[150px] p-2 text-left font-bold text-gray-900 dark:text-gray-100">
        Updated By
      </TableHead>
    </TableRow>
  );
}

