import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CustomFieldDef } from './types';

interface JobsTableHeaderProps {
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  visibleColumns: Set<string>;
  customFields: CustomFieldDef[];
}

export function JobsTableHeader({
  sortField,
  sortDirection,
  onSort,
  visibleColumns,
  customFields,
}: JobsTableHeaderProps) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  function HeaderCell({
    field,
    label,
    sortable = false,
    className = '',
  }: {
    field?: string;
    label: string;
    sortable?: boolean;
    className?: string;
  }) {
    return (
      <TableHead
        className={`font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12 ${
          sortable ? 'cursor-pointer' : ''
        } ${className}`}
        onClick={() => (sortable && field ? onSort(field) : undefined)}
      >
        <div
          className={`flex items-center gap-1 ${className === 'text-right' ? 'justify-end' : ''}`}
        >
          <span>{label}</span>
          {sortable && field && getSortIcon(field)}
        </div>
      </TableHead>
    );
  }

  return (
    <TableHeader>
      <TableRow className="bg-gray-50 dark:bg-black/30 hover:bg-gray-50 dark:hover:bg-black/30 border-b border-gray-200 dark:border-gray-700">
        {/* Mandatory Column: Title */}
        <HeaderCell field="title" label="Job Title" sortable />

        {/* Mandatory Column: Status */}
        <HeaderCell field="status" label="Status" sortable />

        {/* Optional Column: Applications */}
        {visibleColumns.has('applications') && (
          <HeaderCell field="candidateCount" label="Applications" sortable />
        )}

        {/* Optional Column: Experience */}
        {visibleColumns.has('experience') && (
          <HeaderCell field="experience" label="Experience" sortable />
        )}

        {/* Optional Column: Skills */}
        {visibleColumns.has('skills') && <HeaderCell label="Skills" />}

        {/* Dynamic Custom Fields */}
        {customFields.map((field) => {
          if (!visibleColumns.has(field.label)) return null;
          return (
            <HeaderCell
              key={field.label}
              label={field.label.split(' |||||(')[0]}
            />
          );
        })}

        {/* Mandatory Column: Created */}
        <HeaderCell field="createdAt" label="Created" sortable />

        {/* Mandatory Column: Actions */}
        <HeaderCell label="Actions" className="text-right" />
      </TableRow>
    </TableHeader>
  );
}
