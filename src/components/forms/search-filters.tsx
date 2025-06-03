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
import { CalendarClearFooter } from "../calendar/CalendarClearFooter";

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
    <>
      <div className="flex flex-wrap gap-6 mb-6">
        <div className="flex flex-col-3 gap-4 min-w-[250px]">
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
              onChange={(skills) => setFieldValue("skills", skills)}
              onSuggestionClick={(suggestion) => {
                setFieldValue("skills", [...(values.skills || []), suggestion]);
              }}
            />
          </div>
        </div>
        <div className="flex-1 ">
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
                        {/* FROM Date Picker */}
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        {/* TO Date Picker */}
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <div className="flex flex-row gap-6 w-[50%]">
        <div className="flex flex-col-3 gap-4 justify-between">
          <div className="space-y-2 ">
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

          <div className="space-y-2 ">
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

          <div className="space-y-2 ">
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
        
      </div>
      
    </>
  );
}
