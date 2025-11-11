"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Trash2, Plus } from "lucide-react";
import { RenderFieldInFilter } from "@/Custom_Fields/Components/CustomFields/RenderFieldInFilter";
import type { CustomField } from "@/Custom_Fields/Types/CustomField";
import type { Dayjs } from "dayjs";
import type { SearchFilter } from "../candidate-search";

interface CustomFieldsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  metaFields: CustomField[];
  cols: Record<string, string | number | boolean | string[]>[];
  setCols: (
    cols: Record<string, string | number | boolean | string[]>[]
  ) => void;
  values: SearchFilter;
  setFieldValue: (field: string, value: any) => void;
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
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
      <DialogContent size="2xl" className="overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Custom Fields</DialogTitle>
          <DialogDescription>
            Add and configure custom fields for advanced filtering.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Separator className="my-4" />
          <div className="rounded-lg p-4">
            <div className="grid grid-cols-[200px_1fr_2px_0px] gap-4 mb-4">
              <Label className="font-semibold">Field</Label>
              <Label className="font-semibold">Value</Label>
              <div></div>
            </div>

            <div className="space-y-4">
              {cols.map((col, index) => (
                <div key={col.id as string}>
                  <div
                    key={col.id as string}
                    className="grid grid-cols-[200px_1fr_2px_0px] gap-4 items-start"
                  >
                    <Select
                      key={index}
                      value={col.fieldId as string}
                      onValueChange={(fieldId) =>
                        updateSelectedMetaFields(
                          fieldId as string,
                          col.id as string
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {metaFields?.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label.split(" |||||(")[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="min-h-[40px] flex items-center">
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
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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
            size="sm"
            onClick={() => {
              setCols([
                ...cols,
                {
                  id: Math.random().toString(),
                  fieldId: "",
                  value: "",
                  type: "",
                },
              ]);
            }}
          >
            Add Fields <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const trimmedValues = {
                ...values,
                name: values.name?.trim() || "",
                location: values.location?.trim() || "",
                customFields: values.customFields,
                createdAfter: values.createdAfter || "",
                createdBefore: values.createdBefore || "",
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
              setFieldValue("customFields", {});
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
