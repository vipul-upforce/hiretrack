import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Columns } from 'lucide-react';
import { CustomFieldDef } from './types';

interface ColumnsSelectorProps {
  visibleColumns: Set<string>;
  setVisibleColumns: (cols: Set<string>) => void;
  customFields: CustomFieldDef[];
}

export function ColumnsSelector({
  visibleColumns,
  setVisibleColumns,
  customFields,
}: ColumnsSelectorProps) {
  const toggleColumn = (columnId: string, checked: boolean) => {
    const newSet = new Set(visibleColumns);
    if (checked) {
      newSet.add(columnId);
    } else {
      newSet.delete(columnId);
    }
    setVisibleColumns(newSet);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto h-8 lg:flex">
          <Columns className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px] max-h-[400px] overflow-y-auto"
      >
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Standard Optional Columns */}
        <DropdownMenuCheckboxItem
          className="cursor-pointer"
          checked={visibleColumns.has('applications')}
          onCheckedChange={(checked) => toggleColumn('applications', checked)}
        >
          Applications
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="cursor-pointer"
          checked={visibleColumns.has('experience')}
          onCheckedChange={(checked) => toggleColumn('experience', checked)}
        >
          Experience
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="cursor-pointer"
          checked={visibleColumns.has('skills')}
          onCheckedChange={(checked) => toggleColumn('skills', checked)}
        >
          Skills
        </DropdownMenuCheckboxItem>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Custom Fields
            </DropdownMenuLabel>
            {customFields.map((field) => (
              <DropdownMenuCheckboxItem
                className="cursor-pointer"
                key={field.label}
                checked={visibleColumns.has(field.label)}
                onCheckedChange={(checked) => toggleColumn(field.label, checked)}
              >
                {field.label.split(' |||||(')[0]}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
