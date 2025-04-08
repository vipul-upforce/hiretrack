"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetGeminiConfigsQuery,
  useUpdateGeminiMutation,
} from "@/lib/features/settings/settingsApi";
import React from "react";

export interface PortalLogo {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface geminiValues {
  gemini_key: string;
}

type FormFieldName = keyof geminiValues;

export default function GeminiConfigs({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useGetGeminiConfigsQuery(undefined);
  const [updateGeminiConfigs, { isLoading: isUpdating }] =
    useUpdateGeminiMutation();
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: geminiValues = {
    gemini_key: data?.gemini?.gemini_key ?? null,
  };

  const validationSchema = Yup.object({
    gemini_key: Yup.string()
      .trim()
      .required("Key is required")
      .max(50, "Max length 30 chars"),
  });

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      if (values) {
        const dataToSubmit = {
          gemini_key: values.gemini_key,
        };

        await updateGeminiConfigs(dataToSubmit).unwrap();
        toast({
          title: "Success",
          description: "Gemini settings updated successfully",
        });
        refetch();
        onClose();
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update portal settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  const formFields: Array<{
    label: string;
    name: FormFieldName;
    placeholder: string;
    type?: string;
  }> = [
      {
        label: "Gemini Key",
        name: "gemini_key",
        placeholder: "Please enter your Gemini Key",
      },
    ];

  return (
    <Formik<geminiValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        handleChange,
        handleBlur,
        handleSubmit,
        isSubmitting,
        errors,
        touched,
      }) => (
        <Form onSubmit={handleSubmit} className="space-y-4">
          {formFields.map(({ label, name, placeholder }) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                name={name}
                value={
                  typeof values[name] === "string"
                    ? (values[name] as string)
                    : ""
                }
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={
                  errors[name] && touched[name] ? "border-red-500" : ""
                }
              />
              <ErrorMessage
                name={name}
                component="div"
                className="text-red-500 text-sm"
              />
            </div>
          ))}

          <div className="w-full flex justify-end">
            <Button type="submit" disabled={isSubmitting || isUpdating}>
              {isSubmitting || isUpdating ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
