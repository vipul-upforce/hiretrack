"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGet2FAConfigsQuery,
  useUpdate2FAMutation,
} from "@/lib/features/settings/settingsApi";
import React from "react";

export interface TwoFAValues {
  enable2FA: boolean;
}

export default function twoFASettings({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch, error } = useGet2FAConfigsQuery(undefined);
  const [update2FAConfigs, { isLoading: isUpdating }] = useUpdate2FAMutation();

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: TwoFAValues = {
    enable2FA: !!data?.twoFA?.enable2FA,
  };

  const validationSchema = Yup.object({
    enable2FA: Yup.boolean(),
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
      await update2FAConfigs(values).unwrap();
      toast({
        title: "Success",
        description: "2FA settings updated successfully",
      });
      refetch();
      onClose();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.data.error || "Failed to update 2FA settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="px-6 py-4">Loading...</div>;

  return (
    <>
      <Formik<TwoFAValues>
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
                  id="enable2FA"
                  checked={values.enable2FA}
                  disabled={error && "status" in error && error?.status === 403}
                  onCheckedChange={(checked) =>
                    setFieldValue("enable2FA", Boolean(checked))
                  }
                />
                <Label htmlFor="enable2FA">Enable 2FA</Label>
              </div>
              <ErrorMessage
                name="enable2FA"
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
