"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetCaptchaConfigsQuery,
  useUpdateCaptchaMutation,
} from "@/lib/features/settings/settingsApi";
import React, { useEffect, useState } from "react";
import { getDecodedCaptcha, getDecodedSSE } from "@/hooks/useSSE";
import Cookies from "js-cookie";
import { Skeleton } from "@/components/ui/skeleton";

export interface CaptchaValues {
  enableCaptcha: boolean;
  siteKey: string;
  secretKey: string;
}

export default function CaptchaSettings({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch, error } =
    useGetCaptchaConfigsQuery(undefined);
  const [updateCaptchaConfigs, { isLoading: isUpdating }] =
    useUpdateCaptchaMutation();
  const [decryptedValues, setDecryptedValues] = useState<{
    siteKey: string;
    secretKey: string;
  }>({ siteKey: "", secretKey: "" });
  const orgId = Cookies.get("org_id");
  // Decrypt siteKey and secretKey when data is available
  useEffect(() => {
    const decryptData = async () => {
      if (data?.captcha) {
        const decryptedSiteKey = await getDecodedCaptcha(
          data.captcha.siteKey || "",
          orgId
        );
        const decryptedSecretKey = await getDecodedCaptcha(
          data.captcha.secretKey || "",
          orgId
        );
        setDecryptedValues({
          siteKey: decryptedSiteKey || "",
          secretKey: decryptedSecretKey || "",
        });
      }
    };
    decryptData();
  }, [data]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  // const initialValues: CaptchaValues = {
  //   enableCaptcha: !!data?.captcha?.enableCaptcha,
  //   siteKey: data?.captcha?.siteKey || "",
  //   secretKey: data?.captcha?.secretKey || "",
  // };

  const initialValues: CaptchaValues = {
    enableCaptcha: !!data?.captcha?.enableCaptcha,
    siteKey: decryptedValues.siteKey,
    secretKey: decryptedValues.secretKey,
  };
  const validationSchema = Yup.object({
    enableCaptcha: Yup.boolean(),
    siteKey: Yup.string().when("enableCaptcha", {
      is: true,
      then: () => Yup.string().required("Site key is required"),
      otherwise: () => Yup.string().notRequired(),
    }),
    secretKey: Yup.string().when("enableCaptcha", {
      is: true,
      then: () => Yup.string().required("Secret key is required"),
      otherwise: () => Yup.string().notRequired(),
    }),
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
      await updateCaptchaConfigs({
        enableCaptcha: values.enableCaptcha,
        siteKey: values.siteKey,
        secretKey: values.secretKey,
      }).unwrap();
      toast({
        title: "Success",
        description: "CAPTCHA settings updated successfully",
      });
      refetch();
      onClose();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.data.error || "Failed to update CAPTCHA settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="px-6 py-4 space-y-6 animate-in fade-in duration-200">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Formik<CaptchaValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
          <Form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableCaptcha"
                  checked={values.enableCaptcha}
                  onCheckedChange={(checked) =>
                    setFieldValue("enableCaptcha", Boolean(checked))
                  }
                  disabled={error && "status" in error && error?.status === 403}
                />
                <Label htmlFor="enableCaptcha">Enable CAPTCHA</Label>
              </div>
              <ErrorMessage
                name="enableCaptcha"
                component="div"
                className="text-red-500 text-sm"
              />
              {values.enableCaptcha && (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="siteKey">CAPTCHA Site Key</Label>
                    <Input
                      id="siteKey"
                      name="siteKey"
                      value={values.siteKey}
                      onChange={(e) => setFieldValue("siteKey", e.target.value)}
                      placeholder="Enter reCAPTCHA site key"
                      disabled={
                        error && "status" in error && error?.status === 403
                      }
                    />
                    <ErrorMessage
                      name="siteKey"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="secretKey">CAPTCHA Secret Key</Label>
                    <Input
                      id="secretKey"
                      name="secretKey"
                      value={values.secretKey}
                      onChange={(e) =>
                        setFieldValue("secretKey", e.target.value)
                      }
                      placeholder="Enter reCAPTCHA secret key"
                      disabled={
                        error && "status" in error && error?.status === 403
                      }
                    />
                    <ErrorMessage
                      name="secretKey"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                </div>
              )}
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
