"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
} from "@/lib/features/settings/settingsApi";
import { FileUpload } from "@/components/ui/file-upload";
import { v4 as uuidv4 } from "uuid";
import React from "react";
import Cookies from "js-cookie";
import * as jose from "jose";
import CryptoJS from "crypto-js";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

export interface PortalLogo {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface PortalConfigValues {
  portalLogo: File | null;
  portalName: string;
  existingLogo: PortalLogo | null;
}

interface User {
  organizationInfo: {
    name: string;
  };
  // Add other properties as needed
}

type FormFieldName = keyof PortalConfigValues;

export default function PortalConfig({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useGetPortalConfigsQuery(undefined);
  const [updateSMTPConfigs, { isLoading: isUpdating }] =
    useUpdatePortalConfigsMutation();

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: PortalConfigValues = {
    portalLogo: null,
    portalName: data?.portalName ?? "",
    existingLogo: data?.portalLogo ?? null,
  };

  const validationSchema = Yup.object({
    portalName: Yup.string()
      .trim()
      .required("Portal Name is required")
      .max(30, "Max length 30 chars"),
  });

  const signToken = async (payload: unknown) => {
    const JWT_SECRET = "your_jwt_secret_key";
    try {
      // Parse the payload as JSON
      const parsedPayload = payload;
      debugger;
      const encryptedPayload = CryptoJS.AES.encrypt(
        JSON.stringify(parsedPayload),
        JWT_SECRET
      ).toString();
      // Create a secret key for signing
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      // Sign the JWT
      const jwt = await new jose.SignJWT({ user: encryptedPayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d") // Token expires in 2 hours
        .sign(secretKey);

      return jwt;
    } catch {}
  };

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      let portalLogoData = values.existingLogo;
      if (values.portalLogo) {
        const portalLogoBase64 = await convertFileToBase64(values.portalLogo);
        portalLogoData = {
          id: uuidv4(),
          name: values.portalLogo.name,
          url: portalLogoBase64,
          type: values.portalLogo.type,
          size: values.portalLogo.size,
        };
      }

      const dataToSubmit = {
        portalName: values.portalName,
        portalLogo: portalLogoData,
      };
      await updateSMTPConfigs(dataToSubmit);
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          const parsedUser = decryptedResponse.user as User;
          if (parsedUser) {
            parsedUser.organizationInfo.name = dataToSubmit.portalName;
          }
          const token = await signToken(parsedUser);
          Cookies.set("token", String(token), {
            sameSite: "strict",
            expires: 30,
          });
        }
      }
      toast({
        title: "Success",
        description: "Portal settings updated successfully",
      });
      refetch();
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update portal settings",
        variant: "destructive",
      });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  if (isLoading) return <div>Loading...</div>;

  const formFields: Array<{
    label: string;
    name: FormFieldName;
    placeholder: string;
    type?: string;
  }> = [
    {
      label: "Portal Logo",
      name: "portalLogo",
      placeholder: "Upload logo for your portal",
      type: "file",
    },
    {
      label: "Portal Name",
      name: "portalName",
      placeholder: "Enter portal name",
    },
  ];

  return (
    <Formik<PortalConfigValues>
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
        setFieldValue,
        isSubmitting,
        errors,
        touched,
      }) => (
        <Form onSubmit={handleSubmit} className="space-y-4">
          {formFields.map(({ label, name, placeholder, type }) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              {type === "file" ? (
                <>
                  <FileUpload
                    accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
                    maxFiles={1}
                    onFileSelect={(files) => {
                      setFieldValue(name, files[0]);
                      setFieldValue("existingLogo", null);
                    }}
                    files={values[name] ? [values[name] as File] : []}
                    setter={(files) => {
                      setFieldValue(name, files[0]);
                      setFieldValue("existingLogo", null);
                    }}
                  />
                  {!values.portalLogo && values.existingLogo?.url && (
                    <div className="mt-2">
                      <img
                        src={values.existingLogo.url}
                        alt="Current logo"
                        className="max-h-20 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFieldValue("existingLogo", null);
                        }}
                        className="mt-2 text-gray-500 hover:underline"
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}
                </>
              ) : (
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
              )}
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
