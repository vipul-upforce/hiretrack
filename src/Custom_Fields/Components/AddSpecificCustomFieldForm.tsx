import {
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useEffect, useRef } from "react";
import { SelectValue } from "@/components/ui/select";
import React, { useState, useContext, memo, useCallback } from "react";
import { CustomField } from "@/Custom_Fields/Types/CustomField";
import CustomFieldDialog from "./Common/CustomFieldDialog";
import { toast } from "@/Custom_Fields/hooks/use-toast";
import { CustomFieldsContext } from "@/Custom_Fields/Context";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ChipInput } from "@/components/ui/chip-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { fieldTypes } from "@/Custom_Fields/utils";
import { validationSchema } from "@/Custom_Fields/utils/validations";
import {
  Type,
  FileText,
  Hash,
  ChevronDown,
  List,
  Circle,
  CheckSquare,
  Calendar,
  Clock,
  CalendarClock,
  Lock,
  Upload,
  Check,
} from "lucide-react";

const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  select: ChevronDown,
  multiSelect: List,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  time: Clock,
  datetime: CalendarClock,
  password: Lock,
  file: Upload,
};

interface JobCandidateCustomFieldFormProps {
  isOpen: boolean;
  handleClose: () => void;
  onSave: (newField: CustomField) => void;
  isEditMode?: boolean;
  initialValues?: CustomField;
  jobId?: string;
  candidateId?: string;
  jobTitle?: string;
  candidateName?: string;
  existingFields?: CustomField[];
}

export const AddSpecificCustomFieldForm = memo(
  ({
    isOpen,
    handleClose,
    isEditMode = false,
    initialValues: initialValue = {
      id: "",
      label: "",
      type: "text",
      options: [],
      persistance: "permanent",
      defaultValue: "",
      required: false,
      private: false,
      privateInt: false,
      showOnCard: false,
    },
    onSave,
    jobId,
    candidateId,
    jobTitle,
    candidateName,
    existingFields = [],
  }: JobCandidateCustomFieldFormProps) => {
    const {
      handleAddCustomField,
      handleEditCustomField,
      selectedFormId,
      customFields,
    } = useContext(CustomFieldsContext);

    const existingFieldsFromContext = selectedFormId?.fields || [];
    const [initialValues, setInitialValues] = useState<CustomField>({
      id: "",
      label: "",
      type: "text",
      options: [],
      persistance: "permanent",
      defaultValue: "",
      required: false,
      private: false,
      privateInt: false,
      showOnCard: false,
    });
    const [hasDuplicate, setHasDuplicate] = useState(false);

    useEffect(() => {
      if (initialValue && initialValue.id) {
        setInitialValues({
          ...initialValue,
          label: initialValue.label.split(" ||||||(")[0],
        });
      }
    }, [initialValue?.id, initialValue?.label]);

    useEffect(() => {
      if (!isOpen) {
        setHasDuplicate(false);
      }
    }, [isOpen]);

    const checkForDuplicate = useCallback(
      (label: string, excludeId?: string) => {
        const trimmedLabel = label.trim().toLowerCase();
        return existingFieldsFromContext?.some(
          (field) =>
            (field.label.toLowerCase() === trimmedLabel ||
              field.label.toLowerCase() === trimmedLabel + " |||||(i)") &&
            (jobId
              ? field.jobId === jobId
              : field.candidateId === candidateId) &&
            field.id !== excludeId
        );
      },
      [existingFieldsFromContext, jobId, candidateId]
    );

    const onSubmit = useCallback(
      async (
        values: CustomField,
        { resetForm, setFieldError }: FormikHelpers<CustomField>
      ) => {
        if (isEditMode && values.label === initialValue?.label) {
        } else {
          const isDuplicate = checkForDuplicate(
            values.label,
            isEditMode ? initialValue?.id : undefined
          );
          if (isDuplicate) {
            setFieldError("label", "");
            setHasDuplicate(true);
            return;
          }

          selectedFormId &&
            customFields[selectedFormId.formId].fields.some((field) => {
              if (
                (field.jobId || field.candidateId) &&
                field.label === values.label &&
                (!isEditMode || field.id !== initialValue?.id)
              ) {
                values.label = `${values.label} |||||(i)`;
                return true;
              }
              return false;
            });
        }

        try {
          const fieldData = {
            ...values,
            id: isEditMode
              ? initialValue?.id
              : Math.random().toString(36).substr(2, 9),
            jobId,
            candidateId,
          };
          onSave(fieldData);
          handleClose();
          resetForm();
        } catch (error: unknown) {
          if (error instanceof Error)
            toast({
              title: `Error: ${error.message}`,
              description: "Failed to save field",
              variant: "destructive",
            });
        }
      },
      [
        initialValue,
        isEditMode,
        selectedFormId,
        handleClose,
        onSave,
        jobId,
        candidateId,
        checkForDuplicate,
        customFields,
      ]
    );

    const onValuesChange = useCallback(
      (
        value: string,
        values: CustomField,
        setFieldValue: (
          field: string,
          value: string | string[] | undefined
        ) => void
      ) => {
        if (value !== values.type) {
          if (["select", "multiSelect", "radio", "checkbox"].includes(value)) {
            setFieldValue("options", values.options);
            if (["select", "radio"].includes(value)) {
              setFieldValue("defaultValue", "");
            } else {
              setFieldValue("defaultValue", []);
            }
          } else {
            setFieldValue("defaultValue", "");
          }
        }
        setFieldValue("type", value);
      },
      []
    );

    const handleNumberInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setFieldValue: (
        field: string,
        value: string | string[] | undefined
      ) => void
    ) => {
      const value = e.target.value;
      if (value === "" || /^[0-9]+$/.test(value)) {
        setFieldValue("defaultValue", value);
      }
    };

    const handleLabelChange = useCallback(
      (
        e: React.ChangeEvent<HTMLInputElement>,
        setFieldValue: (
          field: string,
          value: string | string[] | undefined
        ) => void,
        setFieldError: (field: string, message: string | undefined) => void
      ) => {
        const value = e.target.value;
        setFieldValue("label", value);
        const isDuplicate = checkForDuplicate(
          value,
          isEditMode ? initialValue?.id : undefined
        );
        setHasDuplicate(isDuplicate);
        if (isDuplicate) {
          setFieldError("label", "");
        }
      },
      [checkForDuplicate, isEditMode, initialValue]
    );

    return (
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Personalized Field"
        regular={false}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
          enableReinitialize={true}
        >
          {({
            values,
            errors,
            touched,
            handleSubmit,
            getFieldProps,
            setFieldValue,
            setFieldError,
          }) => (
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Context Header */}
              <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 mx-4 mt-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {jobId ? (
                      <>
                        <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                          <svg
                            className="w-4 h-4 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.294a23.931 23.931 0 01-4 2.33M16 6H8m0 0V4a2 2 0 012-2h4a2 2 0 012 2v2M8 6v12"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Creating field for Job Position
                          </p>
                          <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {jobTitle || "Job Position"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                          <svg
                            className="w-4 h-4 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Creating field for Candidate
                          </p>
                          <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                            {candidateName || "Candidate"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 px-4 pt-4">
                <div>
                  <Label
                    htmlFor="label"
                    className="text-lg font-medium flex items-center gap-1 pb-3"
                  >
                    Field Label<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="label"
                    {...getFieldProps("label")}
                    onChange={(e) =>
                      handleLabelChange(e, setFieldValue, setFieldError)
                    }
                    className="text-lg py-3 px-4"
                    placeholder="Enter field label..."
                  />
                  {errors.label && touched.label && (
                    <div className="text-red-500 text-sm pt-2 flex items-center gap-1">
                      <span>⚠️</span> {errors.label}
                    </div>
                  )}
                  {hasDuplicate && touched.label && (
                    <div className="text-red-500 text-sm pt-2 flex items-center gap-1">
                      <span>⚠️</span> Label already exists
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="fieldType" className="text-lg font-medium">
                    Field Type
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                    {fieldTypes.map((type) => {
                      const IconComponent = fieldTypeIcons[type.value];
                      const isSelected = values.type === type.value;
                      return (
                        <div
                          key={type.value}
                          className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                          onClick={() =>
                            onValuesChange(type.value, values, setFieldValue)
                          }
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="flex flex-col items-center text-center gap-2">
                            <IconComponent
                              className={`h-6 w-6 ${
                                isSelected
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            />
                            <span
                              className={`text-sm font-medium ${
                                isSelected
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {type.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {["select", "multiSelect", "radio", "checkbox"].includes(
                  values.type
                ) && (
                  <div>
                    <Label
                      htmlFor="options"
                      className="text-lg font-medium block pb-3"
                    >
                      Options{" "}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        (Hit Enter to Add)
                      </span>
                    </Label>
                    <ChipInput
                      value={values.options}
                      onChange={(newOptions) =>
                        setFieldValue(
                          "options",
                          newOptions
                            .map((option) => option.trim())
                            .filter((option) => option !== "")
                        )
                      }
                      placeholder="Type an option and press Enter..."
                      suggestions={[]}
                      // className="text-lg"
                    />
                    {errors.options && touched.options && (
                      <div className="text-red-500 text-sm pt-2 flex items-center gap-1">
                        <span>⚠️</span> {errors.options}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-lg font-medium mb-4 block">
                    Field Options
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        values.required
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() =>
                        setFieldValue("required", !values.required)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.required
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {values.required && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.required
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              Required Field
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Users must fill this field
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        values.private
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => setFieldValue("private", !values.private)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.private
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {values.private && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.private
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              Hide from Candidates
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Candidates cannot see this field
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        values.privateInt
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() =>
                        setFieldValue("privateInt", !values.privateInt)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.privateInt
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {values.privateInt && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.privateInt
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              Hide from Interviewer
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Interviewers cannot see this field
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        values.showOnCard
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() =>
                        setFieldValue("showOnCard", !values.showOnCard)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.showOnCard
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {values.showOnCard && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.showOnCard
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              Show On Card
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Display this field on candidate cards
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {[
                  "date",
                  "datetime",
                  "time",
                  "file",
                  "textarea",
                  "password",
                ].includes(values.type) ? null : (
                  <>
                    {["select", "radio", "checkbox", "multiSelect"].includes(
                      values.type
                    ) ? (
                      <div>
                        <Label
                          htmlFor="defaultValue"
                          className="text-lg font-medium block pb-3"
                        >
                          Default Value
                        </Label>
                        {values.type === "multiSelect" ||
                        values.type === "checkbox" ? (
                          <ChipInput
                            value={values.defaultValue as string[]}
                            onChange={(newOptions) =>
                              setFieldValue(
                                "defaultValue",
                                newOptions
                                  .map((option) => option.trim())
                                  .filter((option) => option !== "")
                              )
                            }
                            onSuggestionClick={(suggestion) => {
                              setFieldValue("defaultValue", [
                                ...(values.defaultValue as string[]),
                                suggestion,
                              ]);
                            }}
                            suggestions={
                              values.options
                                ?.filter(
                                  (option) =>
                                    !values.defaultValue?.includes(option)
                                )
                                .map((option) => option.trim())
                                .filter((option) => option !== "") || []
                            }
                          />
                        ) : (
                          <Select
                            {...getFieldProps("defaultValue")}
                            onValueChange={(value) => {
                              if (value === "-1") {
                                setFieldValue("defaultValue", "");
                              } else {
                                setFieldValue("defaultValue", value.trim());
                              }
                            }}
                            value={String(values.defaultValue || "")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select default value" />
                            </SelectTrigger>
                            <Button
                              style={{
                                marginLeft: "-10px",
                                color: "#797979",
                              }}
                              variant="link"
                              onClick={(e) => {
                                e.preventDefault();
                                setFieldValue("defaultValue", "");
                              }}
                            >
                              Clear
                            </Button>
                            <SelectContent>
                              {values.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label
                          htmlFor="defaultValue"
                          className="text-lg font-medium block pb-3"
                        >
                          Default Value
                        </Label>
                        {values.type === "number" ? (
                          <Input
                            id="defaultValue"
                            value={values.defaultValue || ""}
                            onChange={(e) =>
                              handleNumberInputChange(e, setFieldValue)
                            }
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="text-lg py-3 px-4"
                            placeholder="Enter default number..."
                          />
                        ) : (
                          <Input
                            id="defaultValue"
                            {...getFieldProps("defaultValue")}
                            className="text-lg py-3 px-4"
                            placeholder="Enter default value..."
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="sticky bottom-0 pt-4 pb-2 border-t border-gray-200 dark:border-gray-600 mt-4 px-4">
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="success"
                    size="lg"
                    disabled={
                      !isEditMode &&
                      (hasDuplicate || Object.keys(errors).length > 0)
                    }
                  >
                    {isEditMode ? "Update Field" : "Create Field"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Formik>
      </CustomFieldDialog>
    );
  }
);

AddSpecificCustomFieldForm.displayName = "AddSpecificCustomFieldForm";
