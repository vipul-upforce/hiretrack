"use client";
import { useFormikContext } from "formik";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { CalendarIcon, Plus, Settings, Trash2 } from "lucide-react";
import { SearchFilter } from "./candidate-search";
import { ChipInput } from "../ui/chip-input";
import { CalendarClearFooter } from "../calendar/CalendarClearFooter";
import useCookie from "@/hooks/useCookie";
import { useLazyGetCustomFieldsQuery } from "@/lib/features/org/orgApi";
import { useEffect, useState } from "react";
import { CustomField, FormObject } from "@/Custom_Fields/Types/CustomField";
import { RenderFieldInFilter } from "@/Custom_Fields/Components/CustomFields/RenderFieldInFilter";
import { Dayjs } from "dayjs";

export function SearchFilters({
  handleSearch,
}: {
  handleSearch: (values: SearchFilter) => void;
}) {
  const [metaFields, setMetaFields] = useState<CustomField[] | []>([]);
  const [cols, setCols] = useState<
    Record<string, string | number | boolean | string[]>[]
  >([]);
  const [isMetaFieldsModalOpen, setIsMetaFieldsModalOpen] = useState(false);

  const { values, errors, touched, setFieldValue, handleChange, handleBlur } =
    useFormikContext<SearchFilter>();
  const user = useCookie();
  const [getCustomField] = useLazyGetCustomFieldsQuery();

  useEffect(() => {
    (async () => {
      if (user?.organizationId) {
        const data = await getCustomField(user?.organizationId);
        const metaFieldsData =
          (Object.values(data?.data || {}) as FormObject[]).find(
            (form) => form.formName === "Candidate"
          )?.fields || [];
        setMetaFields(metaFieldsData as CustomField[] | []);
      }
    })();
  }, [user]);

  const updateSelectedMetaFields = (fieldId: string, colId: string) => {
    if (!fieldId) return;
    const selectedField = metaFields.find((f) => f.id === fieldId);
    if (!selectedField) return;
    const existsElsewhere = cols.some(
      (col) => col.fieldId === fieldId && col.id !== colId
    );
    if (existsElsewhere) {
      // console.log(`FieldId "${fieldId}" already assigned elsewhere.`);
      return;
    }
    const newCols = cols.map((col) =>
      col.id === colId
        ? {
            ...col,
            fieldId,
            label: selectedField.label,
            type: selectedField.type,
            options: selectedField.options as string[],
            name: selectedField.label,
            value: selectedField ? "" : (col.value ?? ""),
          }
        : col
    );
    setCols(newCols);
    setFieldValue(
      "customFields",
      Object.fromEntries(newCols.map(({ label, value }) => [label, value]))
    );
  };

  const addMetaField = () => {
    setCols((prev) => [
      ...prev,
      { id: uuidv4(), fieldId: "", value: "", type: "" },
    ]);
  };

  const removeMetaField = (id: string) => {
    setCols((prev) => prev.filter((item) => item.id !== id));
  };

  const updateColValue = (id: string, value: string) => {
    const newCols = cols.map((col) =>
      col.id === id ? { ...col, value: value } : col
    );
    setCols(newCols);
    setFieldValue(
      "customFields",
      Object.fromEntries(newCols.map(({ label, value }) => [label, value]))
    );
  };

  return (
    <>
      <div className="p-6 mx-auto">
        <div className="flex gap-6 mb-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Candidate Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Search by name"
                value={values.name || ""}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="City, State"
                value={values.location || ""}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <Label>Skills (Hit Enter to add)</Label>
              <ChipInput
                placeholder="Hit Enter to Add"
                fullWidth={true}
                value={values.skills}
                onChange={(skills: any) => setFieldValue("skills", skills)}
                onSuggestionClick={(suggestion: any) => {
                  setFieldValue("skills", [
                    ...(values.skills || []),
                    suggestion,
                  ]);
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-3">
          <div className="space-y-2">
            <Label>Expected CTC Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                name="minExpectedCTC"
                placeholder="Min"
                type="number"
                step="0.01"
                value={values.minExpectedCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.minExpectedCTC && touched.minExpectedCTC
                    ? "border-destructive"
                    : ""
                }
              />
              <Input
                name="maxExpectedCTC"
                placeholder="Max"
                type="number"
                step="0.01"
                value={values.maxExpectedCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.maxExpectedCTC && touched.maxExpectedCTC
                    ? "border-destructive"
                    : ""
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current CTC Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                name="minCurrentCTC"
                placeholder="Min"
                type="number"
                step="0.01"
                value={values.minCurrentCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.minCurrentCTC && touched.minCurrentCTC
                    ? "border-destructive"
                    : ""
                }
              />
              <Input
                name="maxCurrentCTC"
                placeholder="Max"
                type="number"
                step="0.01"
                value={values.maxCurrentCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.maxCurrentCTC && touched.maxCurrentCTC
                    ? "border-destructive"
                    : ""
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Experience Range (Years)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                name="minExperience"
                placeholder="Min"
                type="number"
                step="0.01"
                value={values.minExperience || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.minExperience && touched.minExperience
                    ? "border-destructive"
                    : ""
                }
              />
              <Input
                name="maxExperience"
                placeholder="Max"
                type="number"
                step="0.01"
                value={values.maxExperience || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.maxExperience && touched.maxExperience
                    ? "border-destructive"
                    : ""
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-3">
          <div className="relative">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced-filters">
                <AccordionTrigger>Advanced Filters</AccordionTrigger>
                <AccordionContent>
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-10">
                    <div className="space-y-4">
                      <div>
                        <Label>Created Date Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">From</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {values.createdAfter ? (
                                    format(new Date(values.createdAfter), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={
                                    values.createdAfter
                                      ? new Date(values.createdAfter)
                                      : undefined
                                  }
                                  onSelect={(date) =>
                                    setFieldValue(
                                      "createdAfter",
                                      date ? date.toISOString() : ""
                                    )
                                  }
                                  initialFocus
                                  footer={
                                    <CalendarClearFooter
                                      value={values?.createdAfter as string}
                                      onClear={() =>
                                        setFieldValue("createdAfter", "")
                                      }
                                    />
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            {errors.createdAfter && (
                              <p className="text-xs text-destructive mt-1">
                                {errors.createdAfter}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">To</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {values.createdBefore ? (
                                    format(
                                      new Date(values.createdBefore),
                                      "PPP"
                                    )
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={
                                    values.createdBefore
                                      ? new Date(values.createdBefore)
                                      : undefined
                                  }
                                  onSelect={(date) =>
                                    setFieldValue(
                                      "createdBefore",
                                      date ? date.toISOString() : ""
                                    )
                                  }
                                  initialFocus
                                  footer={
                                    <CalendarClearFooter
                                      value={values?.createdBefore as string}
                                      onClear={() =>
                                        setFieldValue("createdBefore", "")
                                      }
                                    />
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            {errors.createdBefore && (
                              <p className="text-xs text-destructive mt-1">
                                {errors.createdBefore}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="logicOperator">Logic Operator</Label>
                        <Select
                          name="logicOperator"
                          value={values.logicOperator || "$and"}
                          onValueChange={(value) =>
                            setFieldValue("logicOperator", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select logic operator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="$and">
                              AND (Match all filters)
                            </SelectItem>
                            <SelectItem value="$or">
                              OR (Match any filter)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <Dialog
                open={isMetaFieldsModalOpen}
                onOpenChange={setIsMetaFieldsModalOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Advance filter with Meta Fields
                    {cols.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {cols.length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Configure Meta Fields</DialogTitle>
                    <DialogDescription>
                      Add and configure custom fields for advanced filtering.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto">
                    <hr />
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
                                    updateColValue(
                                      col.id as string,
                                      value as string
                                    )
                                  }
                                  onBlur={(value) =>
                                    updateColValue(
                                      col.id as string,
                                      value as string
                                    )
                                  }
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 "
                                onClick={() =>
                                  removeMetaField(col.id as string)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {index < metaFields.length - 1 && (
                              <hr className="mt-4 border-gray-200" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 mt-4 ">
                    <Button type="button" size="sm" onClick={addMetaField}>
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
                        };
                        handleSearch(trimmedValues);
                        setIsMetaFieldsModalOpen(false);
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
                      onClick={() => setIsMetaFieldsModalOpen(false)}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
