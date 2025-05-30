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
import React, { useState } from "react";
import Cookies from "js-cookie";
import * as jose from "jose";
import CryptoJS from "crypto-js";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import HtmlEditorPopup from "./HtmlEditorPopup";
import FileUploadDialog from "./FileUploadDialog";

export interface PortalLogo {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface PortalHeader {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;

}

export interface PortalConfigValues {
  portalLogo: File | null;
  portalName: string;
  existingLogo: PortalLogo | null;
  existingHeaderFile: PortalHeader | null | File;
  existingFooterFile: PortalHeader | null | File;
  headerFile?: string | null;
  footerFile?: string | null;
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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    headerHtml?: string;
    footerHtml?: string;
  }>({});
  
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: PortalConfigValues = {
    portalLogo: null,
    portalName: data?.portalName ?? "",
    existingLogo: data?.portalLogo ?? null,
    existingHeaderFile: data?.portalHeader ?? [],
    existingFooterFile: data?.portalFooter ?? [],
    headerFile: null,
    footerFile: null,
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
      // debugger;
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
        .setExpirationTime("30d")
        .sign(secretKey);

      return jwt;
    } catch {}
  };
  const createHtmlFile = (htmlString: string, fileName: string): File => {
    const blob = new Blob([htmlString], { type: "text/html" });
    return new File([blob], fileName, { type: "text/html" });
  };

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      console.log("values :>> ", values);
      let portalLogoData = values.existingLogo;
      let portalHeaderData = values?.existingHeaderFile;
      let portalFooterData = values?.existingFooterFile;

      console.log("portalHeaderData :>> ", portalHeaderData);
      if (values.portalLogo) {
        const portalLogoBase64 = await convertFileToBase64(values.portalLogo);
        portalLogoData = {
          id: uuidv4(),
          name: values.portalLogo.name.trim(),
          url: portalLogoBase64,
          type: values.portalLogo.type,
          size: values.portalLogo.size,
        };
      }
      if (values.headerFile) {
        const headerFile = createHtmlFile(values?.headerFile, "header.html");
        const headerBase64 = await convertFileToBase64(headerFile);

        portalHeaderData = {
          id: uuidv4(),
          name: headerFile.name.trim(),
          url: headerBase64,
          type: headerFile.type,
          size: headerFile.size,
        };
      }
      if (values.footerFile) {
        const footerFile = createHtmlFile(values?.footerFile, "footer.html");
        const footerBase64 = await convertFileToBase64(footerFile);

        portalFooterData = {
          id: uuidv4(),
          name: footerFile.name.trim(),
          url: footerBase64,
          type: footerFile.type,
          size: footerFile.size,
        };
      }
      const dataToSubmit = {
        portalName: values.portalName.trim(),
        portalLogo: portalLogoData,
        portalHeader: portalHeaderData,
        portalFooter: portalFooterData,
      };

      debugger;
      await updateSMTPConfigs(dataToSubmit);
      const token = Cookies.get("token");
      // localStorage.setItem("portalConfig", JSON.stringify(dataToSubmit));
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          const parsedUser = decryptedResponse.user as User;
          if (parsedUser) {
            parsedUser.organizationInfo.name = dataToSubmit.portalName;
          }
          const token = await signToken(parsedUser);
          Cookies.set("token", String(token), {
            expires: 30,
            // maxAge: 30 * 24 * 60 * 60,
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

  const handleOpenEditor = () => {
    setIsUploadDialogOpen(true);
  };

  const handleFilesUploaded = (files: {
    headerHtml?: string;
    footerHtml?: string;
  }) => {
    setUploadedFiles(files);
    setIsUploadDialogOpen(false);
    setIsEditorOpen(true);
  };

  const handleSkipUpload = () => {
    setUploadedFiles({});
    setIsUploadDialogOpen(false);
    setIsEditorOpen(true);
  };

  return (
    <>
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

            <div className="w-full flex justify-end ">
              <Button type="button" className="m-1" onClick={handleOpenEditor}>
                Add Header and Footer
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUpdating}
                className="m-1"
              >
                {isSubmitting || isUpdating ? "Saving..." : "Save Settings"}
              </Button>
            </div>
            <FileUploadDialog
              isOpen={isUploadDialogOpen}
              onClose={() => {
                setIsUploadDialogOpen(false);
                setFieldValue("headerFile", null);
                setFieldValue("footerFile", null);
              }}
              onFilesUploaded={handleFilesUploaded}
              onSkip={handleSkipUpload}
              setFieldValue={setFieldValue}
              values={values}
            />
            <HtmlEditorPopup
              isOpen={isEditorOpen}
              onClose={() => {
                setIsEditorOpen(false);
                setFieldValue("headerFile", null);
                setFieldValue("footerFile", null);
              }}
              setFieldValue={setFieldValue}
              handleSubmit={handleSubmit}
              initialHeaderHtml={uploadedFiles.headerHtml}
              initialFooterHtml={uploadedFiles.footerHtml}
            />
          </Form>
        )}
      </Formik>
    </>
  );
}
