"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetMultipleOrgConfigsQuery,
  useUpdateMultipleOrgMutation,
} from "@/lib/features/settings/settingsApi";
import React from "react";

export interface multipleOrgsValues {
  multipleOrg: boolean;
}

export default function MultipleOrgsConfigs({
  onClose,
}: {
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data, isLoading, refetch, error } =
    useGetMultipleOrgConfigsQuery(undefined);
  const [updateMultipleOrgConfigs, { isLoading: isUpdating }] =
    useUpdateMultipleOrgMutation();

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: multipleOrgsValues = {
    multipleOrg: !!data?.multipleOrg,
  };

  const validationSchema = Yup.object({
    multipleOrg: Yup.boolean(),
  });

  const handleSubmit = async (values: typeof initialValues) => {
    if (error && "status" in error && error?.status === 403) {
      return toast({
        title: "Not Allowed",
        description: "This action is not allowed.",
        variant: "destructive",
      });
    }
    try {
      await updateMultipleOrgConfigs(values).unwrap();
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
      refetch();
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Formik<multipleOrgsValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
        <Form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="multipleOrg"
              checked={values.multipleOrg}
              disabled={error && "status" in error && error?.status === 403}
              onCheckedChange={(checked) =>
                setFieldValue("multipleOrg", Boolean(checked))
              }
            />
            <Label htmlFor="multipleOrg">Allow multiple organizations</Label>
          </div>
          <ErrorMessage
            name="multipleOrg"
            component="div"
            className="text-red-500 text-sm"
          />

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
