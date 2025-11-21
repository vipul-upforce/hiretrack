"use client";
import { CardContent, CardHeader, CardTitle, Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import { DateRangeFilter } from "./date-range-filter";
import { CustomFieldsDialog } from "./custom-fields-dialog";
import type { CustomField } from "@/Custom_Fields/Types/CustomField";
import type { SearchFilter } from "../candidate-search";

interface AdvancedFiltersSectionProps {
  isAdvancedExpanded: boolean;
  setIsAdvancedExpanded: (expanded: boolean) => void;
  createdAfter: string;
  createdBefore: string;
  setFieldValue: (field: string, value: any) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
  isMetaFieldsModalOpen: boolean;
  setIsMetaFieldsModalOpen: (open: boolean) => void;
  metaFields: CustomField[];
  cols: Record<string, string | number | boolean | string[]>[];
  setCols: (
    cols: Record<string, string | number | boolean | string[]>[]
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
    <Card>
      <CardHeader className="pb-6">
        <CardTitle
          className="flex items-center justify-between gap-2 text-base cursor-pointer hover:text-primary transition-colors"
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
      </CardHeader>
      {isAdvancedExpanded && (
        <CardContent className="pt-0 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <DateRangeFilter
              createdAfter={createdAfter}
              createdBefore={createdBefore}
              setFieldValue={setFieldValue}
              hasError={hasError}
              getErrorMessage={getErrorMessage}
            />
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
