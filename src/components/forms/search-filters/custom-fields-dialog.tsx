'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Trash2, Plus } from 'lucide-react';
import { RenderFieldInFilter } from '@/Custom_Fields/Components/CustomFields/RenderFieldInFilter';
import type { CustomField } from '@/Custom_Fields/Types/CustomField';
import type { Dayjs } from 'dayjs';
import { useToast } from '@/hooks/use-toast';
import type { SearchFilter } from '../candidate-search';

interface CustomFieldsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  metaFields: CustomField[];
  cols: Record<string, string | number | boolean | string[]>[];
  setCols: (
    cols: Record<string, string | number | boolean | string[]>[],
  ) => void;
  values: SearchFilter;
  setFieldValue: (
    field: string,
    value: string | number | boolean | string[],
  ) => void;
  handleSearch: (values: SearchFilter) => void;
  updateSelectedMetaFields: (fieldId: string, colId: string) => void;
  updateColValue: (id: string, value: string) => void;
  removeMetaField: (id: string) => void;
}

export function CustomFieldsDialog({
  isOpen,
  setIsOpen,
  metaFields,
  cols,
  setCols,
  values,
  setFieldValue,
  handleSearch,
  updateSelectedMetaFields,
  updateColValue,
  removeMetaField,
}: CustomFieldsDialogProps) {
  const { toast } = useToast();

  const removeInvalidFields = () => {
    const valid = cols.filter(
      (col) =>
        typeof col.fieldId === 'string' &&
        col.fieldId.trim() !== '' &&
        col.value !== '',
    );

    setCols(valid);
    return valid;
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          removeInvalidFields();
        }
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Settings className="h-4 w-4" />
          Custom Fields
          {cols.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {cols.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent size="2xl" className="flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Configure Custom Fields</DialogTitle>
          <DialogDescription>
            Add and configure custom fields for advanced filtering.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Separator className="mb-4 mt-0" />
          <div className="rounded-lg p-4">
            <div className="mb-4 grid grid-cols-[200px_1fr_2px_0px] gap-4">
              <Label className="font-semibold">Field</Label>
              <Label className="font-semibold">Value</Label>
              <div />
            </div>

            <div className="space-y-4 p-2">
              {cols.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <p className="text-sm">
                    Select any custom field filter to get started
                  </p>
                </div>
              )}
              {cols.map((col, index) => (
                <div key={col.id as string}>
                  <div
                    key={col.id as string}
                    className="grid grid-cols-[200px_1fr_2px_0px] items-start gap-4"
                  >
                    <Select
                      key={col.fieldId as string}
                      value={col.fieldId as string}
                      onValueChange={(fieldId) =>
                        updateSelectedMetaFields(
                          fieldId as string,
                          col.id as string,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {metaFields?.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label.split(' |||||(')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex min-h-[40px] items-center">
                      <RenderFieldInFilter
                        label={col.label as string}
                        type={col?.type as string}
                        options={col?.options as string[]}
                        value={
                          col.value as
                            | string
                            | string[]
                            | boolean
                            | Dayjs
                            | [Dayjs, Dayjs]
                            | undefined
                        }
                        onChange={(value) =>
                          updateColValue(col.id as string, value as string)
                        }
                        onBlur={(value) =>
                          updateColValue(col.id as string, value as string)
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                      onClick={() => removeMetaField(col.id as string)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {index < cols.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setCols([
                ...cols,
                {
                  id: Math.random().toString(),
                  fieldId: '',
                  value: '',
                  type: '',
                },
              ]);
            }}
          >
            Add Fields <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const hasInvalid = cols.some(
                (col) =>
                  !col.fieldId ||
                  (typeof col.fieldId === 'string' &&
                    col.fieldId.trim() === '') ||
                  col.value === '' ||
                  col.value === undefined,
              );

              if (hasInvalid) {
                toast({
                  variant: 'destructive',
                  title: 'Incomplete Filter',
                  description: 'Please choose both a field and a value.',
                });
                return;
              }

              const trimmedValues = {
                ...values,
                name: values.name?.trim() || '',
                location: values.location?.trim() || '',
                customFields: values.customFields,
                createdAfter: values.createdAfter || '',
                createdBefore: values.createdBefore || '',
              };

              handleSearch(trimmedValues);
              setIsOpen(false);
            }}
          >
            Apply Filter
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCols([]);
              setFieldValue('customFields', '');
            }}
            disabled={cols.length === 0}
          >
            Clear All
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
