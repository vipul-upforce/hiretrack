"use client";

import React, { useEffect } from "react";
import { ErrorMessage, Form, Formik } from "formik";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useGet2FAConfigsQuery,
  useUpdate2FAMutation,
} from "@/lib/features/settings/settingsApi";
import { TwoFASettingsProps, TwoFAValues, ApiError } from "./types";
import { twoFAValidationSchema } from "./schema";
import { TwoFALoadingSkeleton } from "./loading-skeleton";

export default function TwoFASettings({ onClose }: TwoFASettingsProps) {
  const { toast } = useToast();

  // RTK Query hooks
  const {
    data,
    isLoading,
    refetch,
    error: queryError,
  } = useGet2FAConfigsQuery(undefined);

  const [update2FAConfigs, { isLoading: isUpdating }] = useUpdate2FAMutation();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: TwoFAValues = {
    enable2FA: !!data?.twoFA?.enable2FA,
  };

  const isForbiddenError = (err: unknown): boolean => {
    return (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as ApiError).status === 403
    );
  };

  const handleSubmit = async (values: TwoFAValues) => {
    if (isForbiddenError(queryError)) {
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
    } catch (err: unknown) {
      const apiError = err as ApiError;
      toast({
        title: "Error",
        description: apiError.data?.error || "Failed to update 2FA settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <TwoFALoadingSkeleton />;
  }

  return (
    <Formik<TwoFAValues>
      initialValues={initialValues}
      validationSchema={twoFAValidationSchema}
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
                disabled={isForbiddenError(queryError)}
                onCheckedChange={(checked) =>
                  setFieldValue("enable2FA", Boolean(checked))
                }
              />
              <Label htmlFor="enable2FA">Enable 2FA</Label>
            </div>
            <ErrorMessage
              name="enable2FA"
              component="div"
              className="text-red-500 text-sm mt-1"
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
  );
}
