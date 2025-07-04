import {
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Formik, Form, FormikHelpers } from "formik";
import { SelectValue } from "@/components/ui/select";
import React, { memo } from "react";
import { CustomField } from "@/Custom_Fields/Types/CustomField";
import { toast } from "@/Custom_Fields/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ChipInput } from "@/components/ui/chip-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { fieldTypes } from "@/Custom_Fields/utils";
import { validationSchema } from "@/Custom_Fields/utils/validations";

interface JobCandidateCustomFieldFormProps {
  handleClose: () => void;
  onSave: (newField: CustomField) => void;
  jobId?: string;
  candidateId?: string;
}

export const AddSpecificCustomFieldForm = memo(
  ({
    handleClose,
    onSave,
    jobId,
    candidateId,
  }: JobCandidateCustomFieldFormProps) => {
    const initialValues: CustomField = {
      id: "",
      label: "",
      type: "text",
      options: [],
      persistance: "permanent",
      defaultValue: "",
      required: false,
      private: false,
      showOnCard: false,
    };

    const onSubmit = React.useCallback(
      async (
        values: CustomField,
        { resetForm }: FormikHelpers<CustomField>
      ) => {
        try {
          const fieldData = {
            ...values,
            id: Math.random().toString(36).substr(2, 9),
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
      [handleClose, onSave, jobId, candidateId]
    );

    const onValuesChange = React.useCallback(
      (
        value: string,
        values: CustomField,
        setFieldValue: (
          field: string,
          value: string | string[] | undefined
        ) => void
      ) => {
        // Clear options and default values when type changes
        if (value !== values.type) {
          // Set appropriate default value based on new type
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

    return (
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
        }) => (
          <Form className="space-y-4">
            <div>
              <Label htmlFor="label" className="flex pb-2">
                Field Label<p className="text-red-500">*</p>
              </Label>
              <Input id="label" {...getFieldProps("label")} />
              {errors.label && touched.label && (
                <div className="text-red-500 text-xs pt-1">{errors.label}</div>
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
                onCheckedChange={(checked) => setFieldValue("private", checked)}
              />
              <Label htmlFor="isPrivate">Private Field</Label>
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
                              (option) => !values.defaultValue?.includes(option)
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

            <Button type="submit">Save</Button>
          </Form>
        )}
      </Formik>
    );
  }
);

AddSpecificCustomFieldForm.displayName = "AddSpecificCustomFieldForm";
