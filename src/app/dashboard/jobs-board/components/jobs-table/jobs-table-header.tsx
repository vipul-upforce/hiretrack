import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import React from 'react';
import { CustomFieldDef } from './types';

interface JobsTableHeaderProps {
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  visibleColumns: Set<string>;
  customFields: CustomFieldDef[];
}

function HeaderCell({
  field,
  label,
  sortable = false,
  className = '',
  onSort,
  getSortIcon,
}: {
  field?: string;
  label: string;
  sortable?: boolean;
  className?: string;
  onSort: (f: string) => void;
  getSortIcon: (f: string) => React.ReactNode;
}) {
  return (
    <TableHead
      className={`h-12 px-4 text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 ${
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

  return (
    <TableHeader>
      <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50 dark:border-gray-700 dark:bg-black/30 dark:hover:bg-black/30">
        {/* Mandatory Column: Title */}
        <HeaderCell
          field="title"
          label="Job Title"
          sortable
          onSort={onSort}
          getSortIcon={getSortIcon}
        />

        {/* Mandatory Column: Status */}
        <HeaderCell
          field="status"
          label="Status"
          sortable
          onSort={onSort}
          getSortIcon={getSortIcon}
        />

        {/* Optional Column: Applications */}
        {visibleColumns.has('applications') && (
          <HeaderCell
            field="candidateCount"
            label="Applications"
            sortable
            onSort={onSort}
            getSortIcon={getSortIcon}
          />
        )}

        {/* Optional Column: Experience */}
        {visibleColumns.has('experience') && (
          <HeaderCell
            field="experience"
            label="Experience"
            sortable
            onSort={onSort}
            getSortIcon={getSortIcon}
          />
        )}

        {/* Optional Column: Skills */}
        {visibleColumns.has('skills') && (
          <HeaderCell
            label="Skills"
            onSort={onSort}
            getSortIcon={getSortIcon}
          />
        )}

        {/* Dynamic Custom Fields */}
        {customFields.map((customField) => {
          // Defensive: Ensure label exists and is string, avoid runtime issues.
          if (
            !customField.label ||
            typeof customField.label !== 'string' ||
            !visibleColumns.has(customField.label)
          )
            return null;

          /**
           * Split out suffixes for presentation, only keep the label before delimiter.
           * Delimiter: " |||||(" (legacy/deployment context)
           */
          const displayLabel = customField.label.split(' |||||(')[0];

          return (
            <HeaderCell
              key={customField.label}
              label={displayLabel}
              onSort={onSort}
              getSortIcon={getSortIcon}
            />
          );
        })}

        {/* Mandatory Column: Created */}
        <HeaderCell
          field="createdAt"
          label="Created"
          sortable
          onSort={onSort}
          getSortIcon={getSortIcon}
        />

        {/* Mandatory Column: Actions */}
        <HeaderCell
          label="Actions"
          className="text-right"
          onSort={onSort}
          getSortIcon={getSortIcon}
        />
      </TableRow>
    </TableHeader>
  );
}
