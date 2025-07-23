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
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  CalendarIcon,
  Plus,
  Settings,
  Trash2,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { SearchFilter } from "./candidate-search";
import { ChipInput } from "../ui/chip-input";

import useCookie from "@/hooks/useCookie";
import { useLazyGetCustomFieldsQuery } from "@/lib/features/org/orgApi";
import { useEffect, useState } from "react";
import { CustomField, FormObject } from "@/Custom_Fields/Types/CustomField";
import { RenderFieldInFilter } from "@/Custom_Fields/Components/CustomFields/RenderFieldInFilter";
import { Dayjs } from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
  const [isSalaryExpanded, setIsSalaryExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

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
    const selectedField = metaFields.find((f: CustomField) => f.id === fieldId);
    if (!selectedField) return;
    const existsElsewhere = cols.some(
      (col) => col.fieldId === fieldId && col.id !== colId
    );
    if (existsElsewhere) {
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

  // Helper function to check if a field has an error
  const hasError = (fieldName: string) => {
    return (
      errors[fieldName as keyof typeof errors] &&
      touched[fieldName as keyof typeof touched]
    );
  };

  // Helper function to get error message
  const getErrorMessage = (fieldName: string) => {
    const error = errors[fieldName as keyof typeof errors];
    return hasError(fieldName) ? (typeof error === "string" ? error : "") : "";
  };

  return (
    <div className="space-y-4">
      {/* Basic Search Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-sm font-medium">
                Candidate Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Search by name"
                value={values.name || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={hasError("name") ? "border-destructive" : ""}
              />
              {hasError("name") && (
                <p className="text-xs text-destructive">
                  {getErrorMessage("name")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="location" className="text-sm font-medium">
                Location
              </Label>
              <Input
                id="location"
                name="location"
                placeholder="City, State"
                value={values.location || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={hasError("location") ? "border-destructive" : ""}
              />
              {hasError("location") && (
                <p className="text-xs text-destructive">
                  {getErrorMessage("location")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Skills</Label>
              <ChipInput
                placeholder="Type and press Enter to add skills"
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

            <div className="space-y-1">
              <Label htmlFor="logicOperator" className="text-sm font-medium">
                Logic Operator
              </Label>
              <Select
                name="logicOperator"
                value={values.logicOperator || "$and"}
                onValueChange={(value) => setFieldValue("logicOperator", value)}
              >
                <SelectTrigger
                  className={
                    hasError("logicOperator") ? "border-destructive" : ""
                  }
                >
                  <SelectValue placeholder="Select logic operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$and">AND (Match all filters)</SelectItem>
                  <SelectItem value="$or">OR (Match any filter)</SelectItem>
                </SelectContent>
              </Select>
              {hasError("logicOperator") && (
                <p className="text-xs text-destructive">
                  {getErrorMessage("logicOperator")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary & Experience Section */}
      <Card>
        <CardHeader className="pb-6">
          <CardTitle
            className="flex items-center justify-between gap-2 text-base cursor-pointer hover:text-primary transition-colors px-0 mx-0"
            onClick={() => setIsSalaryExpanded(!isSalaryExpanded)}
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Salary & Experience
            </div>
            {isSalaryExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {isSalaryExpanded && (
          <CardContent className="pt-0 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Expected CTC Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Expected CTC Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      name="minExpectedCTC"
                      placeholder="Min"
                      type="number"
                      step="0.01"
                      value={values.minExpectedCTC || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        hasError("minExpectedCTC") ? "border-destructive" : ""
                      }
                    />
                    {hasError("minExpectedCTC") && (
                      <p className="text-xs text-destructive">
                        {getErrorMessage("minExpectedCTC")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      name="maxExpectedCTC"
                      placeholder="Max"
                      type="number"
                      step="0.01"
                      value={values.maxExpectedCTC || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        hasError("maxExpectedCTC") ? "border-destructive" : ""
                      }
                    />
                    {hasError("maxExpectedCTC") && (
                      <p className="text-xs text-destructive">
                        {getErrorMessage("maxExpectedCTC")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Current CTC Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current CTC Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      name="minCurrentCTC"
                      placeholder="Min"
                      type="number"
                      step="0.01"
                      value={values.minCurrentCTC || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        hasError("minCurrentCTC") ? "border-destructive" : ""
                      }
                    />
                    {hasError("minCurrentCTC") && (
                      <p className="text-xs text-destructive">
                        {getErrorMessage("minCurrentCTC")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      name="maxCurrentCTC"
                      placeholder="Max"
                      type="number"
                      step="0.01"
                      value={values.maxCurrentCTC || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        hasError("maxCurrentCTC") ? "border-destructive" : ""
                      }
                    />
                    {hasError("maxCurrentCTC") && (
                      <p className="text-xs text-destructive">
                        {getErrorMessage("maxCurrentCTC")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Experience Range (Years)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      name="minExperience"
                      placeholder="Min"
                      type="number"
                      step="0.01"
                      value={values.minExperience || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        hasError("minExperience") ? "border-destructive" : ""
                      }
                    />
                    {hasError("minExperience") && (
                      <p className="text-xs text-destructive">
                        {getErrorMessage("minExperience")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      name="maxExperience"
                      placeholder="Max"
                      type="number"
                      step="0.01"
                      value={values.maxExperience || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        hasError("maxExperience") ? "border-destructive" : ""
                      }
                    />
                    {hasError("maxExperience") && (
                      <p className="text-xs text-destructive">
                        {getErrorMessage("maxExperience")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Advanced Filters Section */}
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Created Date Range
                </Label>
                <div className="space-y-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal h-9 ${
                          hasError("createdAfter") || hasError("createdBefore")
                            ? "border-destructive"
                            : ""
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {values.createdAfter && values.createdBefore ? (
                          <span>
                            {format(new Date(values.createdAfter), "MMM dd")} -{" "}
                            {format(
                              new Date(values.createdBefore),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        ) : values.createdAfter ? (
                          <span>
                            From{" "}
                            {format(
                              new Date(values.createdAfter),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        ) : values.createdBefore ? (
                          <span>
                            Until{" "}
                            {format(
                              new Date(values.createdBefore),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Select date range
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <DatePicker
                        value={
                          values.createdAfter && values.createdBefore
                            ? [
                                new Date(values.createdAfter),
                                new Date(values.createdBefore),
                              ]
                            : null
                        }
                        onChange={(dateRange) => {
                          if (
                            Array.isArray(dateRange) &&
                            dateRange.length === 2
                          ) {
                            const [startDate, endDate] = dateRange;
                            setFieldValue(
                              "createdAfter",
                              startDate && startDate instanceof Date
                                ? startDate.toISOString()
                                : ""
                            );
                            setFieldValue(
                              "createdBefore",
                              endDate && endDate instanceof Date
                                ? endDate.toISOString()
                                : ""
                            );
                          } else {
                            // Clear both dates
                            setFieldValue("createdAfter", "");
                            setFieldValue("createdBefore", "");
                          }
                        }}
                        range={true}
                        showTimePicker={false}
                        format="MM/DD/YYYY"
                        placeholder="Select date range"
                      />
                    </PopoverContent>
                  </Popover>
                  {(hasError("createdAfter") || hasError("createdBefore")) && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage("createdAfter") ||
                        getErrorMessage("createdBefore")}
                    </p>
                  )}
                </div>
              </div>

              {/* Empty space for balance */}
              <div></div>
            </div>

            {/* Custom Fields Button */}
            <div className="mt-4">
              <Dialog
                open={isMetaFieldsModalOpen}
                onOpenChange={setIsMetaFieldsModalOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Custom Fields
                    {cols.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {cols.length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  removeMetaField(col.id as string)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {index < metaFields.length - 1 && (
                              <Separator className="mt-4" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 mt-4">
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
          </CardContent>
        )}
      </Card>
    </div>
  );
}
