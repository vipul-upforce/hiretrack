"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import React, { useEffect, useState, useCallback } from "react";

export interface AutoUpdateValues {
  enableAutoUpdate: boolean;
}

// Reusable API functions
async function fetchAutoUpdateValue(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/settings/auto-update", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.autoUpdate === "boolean") {
      return data.autoUpdate;
    }
    return null;
  } catch {
    return null;
  }
}

async function updateAutoUpdateValue(): Promise<{
  autoUpdate?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/settings/auto-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: "Failed to update auto-update setting" };
  }
}

export default function AutoUpdateSettings({
  onClose,
}: {
  onClose: (values?: AutoUpdateValues) => void;
}) {
  const { toast } = useToast();
  const [initialValues, setInitialValues] = useState<AutoUpdateValues | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Fetch the current autoUpdate value from the API
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAutoUpdateValue().then((autoUpdate) => {
      if (mounted) {
        setInitialValues({ enableAutoUpdate: !!autoUpdate });
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const validationSchema = Yup.object({
    enableAutoUpdate: Yup.boolean(),
  });

  // Handles the form submit and updates the config via API
  const handleSubmit = useCallback(
    async (
      values: AutoUpdateValues,
      { setSubmitting }: { setSubmitting: (b: boolean) => void }
    ) => {
      setSubmitting(true);
      try {
        // The API toggles the value, so only call if the value is different
        if (
          initialValues &&
          values.enableAutoUpdate !== initialValues.enableAutoUpdate
        ) {
          const result = await updateAutoUpdateValue();
          if (result.error) {
            throw new Error(result.error);
          }
          toast({
            title: "Success",
            description: "Auto-update settings updated successfully",
          });
          setInitialValues({ enableAutoUpdate: !!result.autoUpdate });
          onClose({ enableAutoUpdate: !!result.autoUpdate });
        } else {
          // No change, just close
          onClose(values);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Failed to update auto-update settings",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [initialValues, toast, onClose]
  );

  if (loading || !initialValues) {
    return (
      <div className="flex items-center justify-center py-8">
        <span>Loading auto-update settings...</span>
      </div>
    );
  }

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
                  disabled={isSubmitting}
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
