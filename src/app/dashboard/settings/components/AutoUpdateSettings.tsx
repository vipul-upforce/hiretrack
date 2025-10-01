"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import React from "react";

export interface AutoUpdateValues {
  enableAutoUpdate: boolean;
}

export default function AutoUpdateSettings({
  initialAutoUpdate = false,
  onClose,
}: {
  initialAutoUpdate?: boolean;
  onClose: (values?: AutoUpdateValues) => void;
}) {
  const { toast } = useToast();

  const initialValues: AutoUpdateValues = {
    enableAutoUpdate: initialAutoUpdate,
  };

  const validationSchema = Yup.object({
    enableAutoUpdate: Yup.boolean(),
  });

  const handleSubmit = (values: AutoUpdateValues) => {
    try {
      // Simulate saving the auto-update setting (no API)
      toast({
        title: "Success",
        description: "Auto-update settings updated successfully",
      });
      onClose(values); // Pass the updated values back to the parent
    } catch (e: any) {
      toast({
        title: "Error",
        description: "Failed to update auto-update settings",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Formik<AutoUpdateValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
          <Form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-6 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableAutoUpdate"
                  checked={values.enableAutoUpdate}
                  onCheckedChange={(checked) =>
                    setFieldValue("enableAutoUpdate", Boolean(checked))
                  }
                />
                <Label htmlFor="enableAutoUpdate">Enable Auto-Update</Label>
              </div>
              <ErrorMessage
                name="enableAutoUpdate"
                component="div"
                className="text-red-500 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} variant="primary">
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
