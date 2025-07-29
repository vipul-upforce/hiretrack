import {
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Formik, FormikHelpers } from "formik";
import { SelectValue } from "@/components/ui/select";
import React, {
  useState,
  useContext,
  memo,
  useEffect,
  useCallback,
} from "react";
import {
  CustomField,
  CustomFieldFormProps,
} from "@/Custom_Fields/Types/CustomField";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
import CustomFieldDialog from "../Common/CustomFieldDialog";
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

const CustomFieldForm = memo(
  ({ isOpen, handleClose, initialValue, isEditMode }: CustomFieldFormProps) => {
    const {
      handleAddCustomField,
      handleEditCustomField,
      selectedFormId,
      customFields,
    } = useContext(CustomFieldsContext);

    const existingFields = selectedFormId?.fields || [];
    // const [duplicationAlert, setDuplicationAlert] = useState<boolean>(false);
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
    // const [dupLabel, setDupLabel] = useState<string | null>(null);
    const [hasDuplicate, setHasDuplicate] = useState(false);

    useEffect(() => {
      if (initialValue) {
        setInitialValues({
          ...initialValue,
          label: initialValue.label.split(" |||||(")[0],
        });
      }
    }, [initialValue]);

    const checkForDuplicate = useCallback(
      (label: string, excludeId?: string) => {
        const trimmedLabel = label.trim().toLowerCase();
        return existingFields?.some(
          (field) =>
            (field.label.toLowerCase() === trimmedLabel ||
              field.label.toLowerCase() === trimmedLabel + " |||||(g)") &&
            !field.candidateId &&
            !field.jobId &&
            field.id !== excludeId
        );
      },
      [existingFields]
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

          // const hasGlobalDuplicate =
          selectedFormId &&
            customFields[selectedFormId.formId].fields.some((field) => {
              // debugger;
              if (
                (field.jobId || field.candidateId) &&
                field.label === values.label &&
                (!isEditMode || field.id !== initialValue?.id)
              ) {
                values.label = `${values.label} |||||(g)`;
                // setDupLabel(field.label);
                // setDuplicationAlert(true);
                return true;
              }
              return false;
            });

          // if (hasGlobalDuplicate) {
          //   return;
          // }
        }

        try {
          if (isEditMode) {
            handleEditCustomField(
              values as CustomField,
              selectedFormId?.formId || null
            );
          } else {
            const fieldData = {
              ...values,
              id: Math.random().toString(36).substr(2, 9),
            };
            handleAddCustomField(
              fieldData as CustomField,
              selectedFormId?.formId || null
            );
          }
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
        handleEditCustomField,
        handleAddCustomField,
        handleClose,
        checkForDuplicate,
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
        title="Meta Field"
        regular={false}
      >
        {/* <AlertDialog open={duplicationAlert} onOpenChange={setDuplicationAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplication Alert</AlertDialogTitle>
              <AlertDialogDescription>
                <p className="text-lg">{dupLabel}</p> This action was not
                completed because a field with this label already exists in
                global meta fields.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => setDuplicationAlert(false)}
                className={
                  "text-blue-500 bg-blue hover:bg-blue hover:text-blue-500/90"
                }
              >
                Okay
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog> */}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
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
              <div className="flex-1 overflow-y-auto space-y-8 pb-6">
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
                              ? "shadow-md"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: "var(--portal-primary, #6366f1)",
                                  backgroundColor:
                                    "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                                }
                              : {}
                          }
                          onClick={() =>
                            onValuesChange(type.value, values, setFieldValue)
                          }
                        >
                          {isSelected && (
                            <div
                              className="absolute -top-2 -right-2 text-white rounded-full p-1"
                              style={{
                                backgroundColor:
                                  "var(--portal-primary, #6366f1)",
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="flex flex-col items-center text-center gap-2">
                            <IconComponent
                              className={`h-6 w-6 ${
                                isSelected
                                  ? ""
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                              style={
                                isSelected
                                  ? { color: "var(--portal-primary, #6366f1)" }
                                  : {}
                              }
                            />
                            <span
                              className={`text-sm font-medium ${
                                isSelected
                                  ? ""
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                              style={
                                isSelected
                                  ? { color: "var(--portal-primary, #6366f1)" }
                                  : {}
                              }
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
                          ? "shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={
                        values.required
                          ? {
                              borderColor: "var(--portal-primary, #6366f1)",
                              backgroundColor:
                                "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldValue("required", !values.required)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.required
                                ? ""
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                            style={
                              values.required
                                ? {
                                    backgroundColor:
                                      "var(--portal-primary, #6366f1)",
                                    borderColor:
                                      "var(--portal-primary, #6366f1)",
                                  }
                                : {}
                            }
                          >
                            {values.required && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.required
                                  ? ""
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                              style={
                                values.required
                                  ? { color: "var(--portal-primary, #6366f1)" }
                                  : {}
                              }
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
                          ? "shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={
                        values.private
                          ? {
                              borderColor: "var(--portal-primary, #6366f1)",
                              backgroundColor:
                                "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                            }
                          : {}
                      }
                      onClick={() => setFieldValue("private", !values.private)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.private
                                ? ""
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                            style={
                              values.private
                                ? {
                                    backgroundColor:
                                      "var(--portal-primary, #6366f1)",
                                    borderColor:
                                      "var(--portal-primary, #6366f1)",
                                  }
                                : {}
                            }
                          >
                            {values.private && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.private
                                  ? ""
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                              style={
                                values.private
                                  ? { color: "var(--portal-primary, #6366f1)" }
                                  : {}
                              }
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
                          ? "shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={
                        values.privateInt
                          ? {
                              borderColor: "var(--portal-primary, #6366f1)",
                              backgroundColor:
                                "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldValue("privateInt", !values.privateInt)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.privateInt
                                ? ""
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                            style={
                              values.privateInt
                                ? {
                                    backgroundColor:
                                      "var(--portal-primary, #6366f1)",
                                    borderColor:
                                      "var(--portal-primary, #6366f1)",
                                  }
                                : {}
                            }
                          >
                            {values.privateInt && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.privateInt
                                  ? ""
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                              style={
                                values.privateInt
                                  ? { color: "var(--portal-primary, #6366f1)" }
                                  : {}
                              }
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
                          ? "shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={
                        values.showOnCard
                          ? {
                              borderColor: "var(--portal-primary, #6366f1)",
                              backgroundColor:
                                "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldValue("showOnCard", !values.showOnCard)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              values.showOnCard
                                ? ""
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                            style={
                              values.showOnCard
                                ? {
                                    backgroundColor:
                                      "var(--portal-primary, #6366f1)",
                                    borderColor:
                                      "var(--portal-primary, #6366f1)",
                                  }
                                : {}
                            }
                          >
                            {values.showOnCard && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.showOnCard
                                  ? ""
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                              style={
                                values.showOnCard
                                  ? { color: "var(--portal-primary, #6366f1)" }
                                  : {}
                              }
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

              <div className="sticky bottom-0 bg-background border-t border-gray-200 dark:border-gray-600 px-6 py-4">
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

CustomFieldForm.displayName = "CustomFieldForm";

export default React.memo(CustomFieldForm);
