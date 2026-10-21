'use client';

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Card,
} from '@/components/ui/card';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import type { CustomField } from '@/Custom_Fields/Types/CustomField';
import { DateRangeFilter } from './date-range-filter';
import { CustomFieldsDialog } from './custom-fields-dialog';
import type { SearchFilter } from '../candidate-search';

interface AdvancedFiltersSectionProps {
  isAdvancedExpanded: boolean;
  setIsAdvancedExpanded: (expanded: boolean) => void;
  createdAfter: string;
  createdBefore: string;
  setFieldValue: (
    field: string,
    value: string | number | boolean | string[],
  ) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
  isMetaFieldsModalOpen: boolean;
  setIsMetaFieldsModalOpen: (open: boolean) => void;
  metaFields: CustomField[];
  cols: Record<string, string | number | boolean | string[]>[];
  setCols: (
    cols: Record<string, string | number | boolean | string[]>[],
  ) => void;
  values: SearchFilter;
  handleSearch: (values: SearchFilter) => void;
  updateSelectedMetaFields: (fieldId: string, colId: string) => void;
  updateColValue: (id: string, value: string) => void;
  removeMetaField: (id: string) => void;
}

export function AdvancedFiltersSection({
  isAdvancedExpanded,
  setIsAdvancedExpanded,
  createdAfter,
  createdBefore,
  setFieldValue,
  hasError,
  getErrorMessage,
  isMetaFieldsModalOpen,
  setIsMetaFieldsModalOpen,
  metaFields,
  cols,
  setCols,
  values,
  handleSearch,
  updateSelectedMetaFields,
  updateColValue,
  removeMetaField,
}: AdvancedFiltersSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle
          className="flex cursor-pointer items-center justify-between gap-2 text-base transition-colors hover:text-primary"
          onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced Filters
          </div>
          {isAdvancedExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Use date range or custom fields for targeted searches.
        </CardDescription>
      </CardHeader>
      {isAdvancedExpanded && (
        <CardContent className="pb-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Date Range */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <DateRangeFilter
                createdAfter={createdAfter}
                createdBefore={createdBefore}
                setFieldValue={setFieldValue}
                hasError={hasError}
                getErrorMessage={getErrorMessage}
              />
            </div>
          </div>

          {/* Custom Fields Button */}
          <div className="mt-4">
            <CustomFieldsDialog
              isOpen={isMetaFieldsModalOpen}
              setIsOpen={setIsMetaFieldsModalOpen}
              metaFields={metaFields}
              cols={cols}
              setCols={setCols}
              values={values}
              setFieldValue={setFieldValue}
              handleSearch={handleSearch}
              updateSelectedMetaFields={updateSelectedMetaFields}
              updateColValue={updateColValue}
              removeMetaField={removeMetaField}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
