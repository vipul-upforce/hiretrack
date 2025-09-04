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
import { useDispatch } from "react-redux";
import { setAllowMultipleOrgs } from "@/lib/features/org/orgSlice";

export interface multipleOrgsValues {
  multipleOrg: boolean;
}

export default function MultipleOrgsConfigs({
  onClose,
}: {
  onClose: () => void;
}) {
  const { toast } = useToast();
  const dispatch = useDispatch();
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

      dispatch(setAllowMultipleOrgs(values.multipleOrg));

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

  if (isLoading) return <div className="px-6 py-4">Loading...</div>;

  return (
    <>
      <Formik<multipleOrgsValues>
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
            </div>

            <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUpdating}
                variant="primary"
              >
                {isSubmitting || isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
