"use client";
import { Label } from "@/components/ui/label";
import type React from "react";

import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import type { SearchFilter } from "../candidate-search";

interface SalaryExperienceSectionProps {
  values: SearchFilter;
  errors: Record<string, any>;
  touched: Record<string, any>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleBlur: (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  isSalaryExpanded: boolean;
  setIsSalaryExpanded: (expanded: boolean) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
}

export function SalaryExperienceSection({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  isSalaryExpanded,
  setIsSalaryExpanded,
  hasError,
  getErrorMessage,
}: SalaryExperienceSectionProps) {
  return (
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
        <CardContent className="pt-0 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Expected CTC Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Expected CTC Range</Label>
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
  );
}
