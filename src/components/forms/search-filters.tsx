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
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { SearchFilter } from "./candidate-search";
import { ChipInput } from "../ui/chip-input";

// // Mock data for skills
// const availableSkills = [
//   "JavaScript",
//   "TypeScript",
//   "React",
//   "Angular",
//   "Vue",
//   "Node.js",
//   "Python",
//   "Java",
//   "C#",
//   "PHP",
//   "Ruby",
//   "Go",
//   "Rust",
//   "Swift",
//   "Kotlin",
//   "MATLAB",
//   "R",
// ];

export function SearchFilters() {
  const { values, errors, touched, setFieldValue, handleChange, handleBlur } =
    useFormikContext<SearchFilter>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Basic Filters */}
      <div className="space-y-4">
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
          <div className="flex gap-2">
            <ChipInput
              placeholder="Hit Enter to Add"
              fullWidth={true}
              value={values.skills}
              onChange={(skills) => setFieldValue("skills", skills)}
              onSuggestionClick={(suggestion) => {
                setFieldValue("skills", [...(values.skills || []), suggestion]);
              }}
              // suggestions={
              //   availableSkills.filter(
              //     (skill) => !values?.skills?.includes(skill)
              //   ) || []
              // }
              // error={skillsMeta.touched && skillsMeta.error}
            />
          </div>
        </div>
      </div>

      {/* Numeric Filters */}
      <div className="space-y-4">
        <div>
          <Label>Expected CTC Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                id="minExpectedCTC"
                name="minExpectedCTC"
                type="number"
                step="0.01"
                placeholder="Min"
                value={values.minExpectedCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.minExpectedCTC && touched.minExpectedCTC
                    ? "border-destructive"
                    : ""
                }
              />
              {errors.minExpectedCTC && touched.minExpectedCTC && (
                <p className="text-xs text-destructive mt-1">
                  {errors.minExpectedCTC}
                </p>
              )}
            </div>
            <div>
              <Input
                id="maxExpectedCTC"
                name="maxExpectedCTC"
                type="number"
                step="0.01"
                placeholder="Max"
                value={values.maxExpectedCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.maxExpectedCTC && touched.maxExpectedCTC
                    ? "border-destructive"
                    : ""
                }
              />
              {errors.maxExpectedCTC && touched.maxExpectedCTC && (
                <p className="text-xs text-destructive mt-1">
                  {errors.maxExpectedCTC}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label>Current CTC Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                id="minCurrentCTC"
                name="minCurrentCTC"
                type="number"
                step="0.01"
                placeholder="Min"
                value={values.minCurrentCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.minCurrentCTC && touched.minCurrentCTC
                    ? "border-destructive"
                    : ""
                }
              />
              {errors.minCurrentCTC && touched.minCurrentCTC && (
                <p className="text-xs text-destructive mt-1">
                  {errors.minCurrentCTC}
                </p>
              )}
            </div>
            <div>
              <Input
                id="maxCurrentCTC"
                name="maxCurrentCTC"
                type="number"
                step="0.01"
                placeholder="Max"
                value={values.maxCurrentCTC || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.maxCurrentCTC && touched.maxCurrentCTC
                    ? "border-destructive"
                    : ""
                }
              />
              {errors.maxCurrentCTC && touched.maxCurrentCTC && (
                <p className="text-xs text-destructive mt-1">
                  {errors.maxCurrentCTC}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label>Experience Range (Years)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                id="minExperience"
                name="minExperience"
                type="number"
                step="0.01"
                placeholder="Min"
                value={values.minExperience || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.minExperience && touched.minExperience
                    ? "border-destructive"
                    : ""
                }
              />
              {errors.minExperience && touched.minExperience && (
                <p className="text-xs text-destructive mt-1">
                  {errors.minExperience}
                </p>
              )}
            </div>
            <div>
              <Input
                id="maxExperience"
                name="maxExperience"
                type="number"
                step="0.01"
                placeholder="Max"
                value={values.maxExperience || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={
                  errors.maxExperience && touched.maxExperience
                    ? "border-destructive"
                    : ""
                }
              />
              {errors.maxExperience && touched.maxExperience && (
                <p className="text-xs text-destructive mt-1">
                  {errors.maxExperience}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="space-y-4 lg:col-span-1 md:col-span-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced-filters">
            <AccordionTrigger>Advanced Filters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
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
                              format(new Date(values.createdBefore), "PPP")
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
                      <SelectItem value="$or">OR (Match any filter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
