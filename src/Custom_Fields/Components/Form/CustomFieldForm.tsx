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
        title="Global Meta Fields"
        regular
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="label" className="flex pb-2">
                  Field Label<p className="text-red-500">*</p>
                </Label>
                <Input
                  id="label"
                  {...getFieldProps("label")}
                  onChange={(e) =>
                    handleLabelChange(e, setFieldValue, setFieldError)
                  }
                />
                {errors.label && touched.label && (
                  <div className="text-red-500 text-xs pt-1">
                    {errors.label}
                  </div>
                )}
                {hasDuplicate && touched.label && (
                  <div className="text-red-500 text-xs pt-1">
                    Already exists
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="fieldType">Field Type</Label>
                <Select
                  onValueChange={(value) =>
                    onValuesChange(value, values, setFieldValue)
                  }
                  value={values.type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {["select", "multiSelect", "radio", "checkbox"].includes(
                values.type
              ) && (
                <div>
                  <Label htmlFor="options">Options ( Hit Enter to Add )</Label>
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
                    placeholder="Add options..."
                    suggestions={[]}
                  />
                  {errors.options && touched.options && (
                    <div className="text-red-500">{errors.options}</div>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRequired"
                  checked={values.required}
                  onCheckedChange={(checked) =>
                    setFieldValue("required", checked)
                  }
                />
                <Label htmlFor="isRequired">Required Field</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrivate"
                  checked={values.private}
                  onCheckedChange={(checked) =>
                    setFieldValue("private", checked)
                  }
                />
                <Label htmlFor="isPrivate">Hide from Candidates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrivateInt"
                  checked={values.privateInt}
                  onCheckedChange={(checked) =>
                    setFieldValue("privateInt", checked)
                  }
                />
                <Label htmlFor="isPrivateInt">Hide from Interviewer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showOnCard"
                  checked={values.showOnCard}
                  onCheckedChange={(checked) =>
                    setFieldValue("showOnCard", checked)
                  }
                />
                <Label htmlFor="showOnCard">Show On Card</Label>
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
                      <Label htmlFor="defaultValue">Default Value</Label>
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
                      <Label htmlFor="defaultValue">Default Value</Label>
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
                        />
                      ) : (
                        <Input
                          id="defaultValue"
                          {...getFieldProps("defaultValue")}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                disabled={
                  !isEditMode &&
                  (hasDuplicate || Object.keys(errors).length > 0)
                }
              >
                Save
              </Button>
            </form>
          )}
        </Formik>
      </CustomFieldDialog>
    );
  }
);

CustomFieldForm.displayName = "CustomFieldForm";

export default React.memo(CustomFieldForm);
