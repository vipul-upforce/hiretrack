"use client";
import React, { useState, useRef, useEffect } from "react";
import { Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Editor } from "@monaco-editor/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApplyJobsContent from "@/app/apply-jobs/ApplyJobContent";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
} from "@/lib/features/settings/settingsApi";
import { PortalFileUpload } from "@/components/ui/portalFileUpload";
import { v4 as uuidv4 } from "uuid";
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

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: "on" as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: "on" as const,
  formatOnPaste: true,
  formatOnType: true,
};

interface User {
  organizationInfo: {
    name: string;
  };
}

type FormFieldName = keyof PortalConfigValues;

const formFields: Array<{
  label: string;
  name: FormFieldName;
  placeholder: string;
  type?: string;
}> = [
  {
    label: "Portal Name",
    name: "portalName",
    placeholder: "Enter portal name",
  },
  {
    label: "Portal Logo",
    name: "portalLogo",
    placeholder: "Upload logo for your portal",
    type: "file",
  },
];

export default function PortalConfig({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, refetch } = useGetPortalConfigsQuery(undefined);
  const [updateSMTPConfigs] =
    useUpdatePortalConfigsMutation();
  const [activeTab, setActiveTab] = useState("header");
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const footerFileInputRef = useRef<HTMLInputElement>(null);
  const [headerFileName, setHeaderFileName] = useState<string | null>(null);
  const [footerFileName, setFooterFileName] = useState<string | null>(null);

  const [headerCode, setHeaderCode] = useState(
    `<header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 1rem; display: flex; justify-content: space-between; align-items: center;">
    <div style="font-size: 1.5rem; font-weight: bold;">Organization Name</div>
    <nav style="display: flex; gap: 2rem;"></nav>
  </div>
</header>`
  );

  const [footerCode, setFooterCode] = useState(
    `<footer style="background: #1a202c; color: #a0aec0; padding: 1rem 0; text-align: center;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 1rem;">
    <p>© 2024 Your Company. All rights reserved.</p>
  </div>
</footer>`
  );

  // Fetch HTML content from API response URLs and set file names
  useEffect(() => {
    const fetchHtmlContent = async () => {
      try {
        if (data?.portalHeader?.url) {
          const response = await fetch(data.portalHeader.url);
          if (response.ok) {
            const content = await response.text();
            setHeaderCode(content);
            setHeaderFileName(data.portalHeader.name);
          } else {
            throw new Error("Failed to fetch header content");
          }
        }
        if (data?.portalFooter?.url) {
          const response = await fetch(data.portalFooter.url);
          if (response.ok) {
            const content = await response.text();
            setFooterCode(content);
            setFooterFileName(data.portalFooter.name);
          } else {
            throw new Error("Failed to fetch footer content");
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch header/footer content",
          variant: "destructive",
        });
      }
    };

    if (data) {
      fetchHtmlContent();
    }
  }, [data, toast]);

  const initialValues: PortalConfigValues = {
    portalLogo: null,
    portalName: data?.portalName ?? "",
    existingLogo: data?.portalLogo ?? null,
    existingHeaderFile: data?.portalHeader ?? null,
    existingFooterFile: data?.portalFooter ?? null,
    headerFile: headerCode,
    footerFile: footerCode,
  };

  const validationSchema = Yup.object({
    portalName: Yup.string()
      .trim()
      .required("Portal Name is required")
      .max(30, "Max length 30 chars"),
  });

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const createHtmlFile = (htmlString: string, fileName: string): File => {
    const blob = new Blob([htmlString], { type: "text/html" });
    return new File([blob], fileName, { type: "text/html" });
  };

  const signToken = async (payload: unknown) => {
    const JWT_SECRET = "your_jwt_secret_key";
    try {
      const parsedPayload = payload;
      const encryptedPayload = CryptoJS.AES.encrypt(
        JSON.stringify(parsedPayload),
        JWT_SECRET
      ).toString();
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      const jwt = await new jose.SignJWT({ user: encryptedPayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);
      return jwt;
    } catch {
      throw new Error("Failed to sign token");
    }
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "header" | "footer",
    setFieldValue: (field: string, value: any) => void
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/html") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (type === "header") {
          setHeaderCode(content);
          setFieldValue("headerFile", content);
          setHeaderFileName(file.name);
        } else {
          setFooterCode(content);
          setFieldValue("footerFile", content);
          setFooterFileName(file.name);
        }
        toast({
          title: "Success",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} HTML uploaded successfully`,
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: `Failed to read ${type} HTML file`,
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Error",
        description: "Please upload a valid HTML file",
        variant: "destructive",
      });
    }
    event.target.value = "";
  };

  const handleSubmit = async (values: PortalConfigValues) => {
    try {
      let portalLogoData = values.existingLogo;
      let portalHeaderData = values.existingHeaderFile;
      let portalFooterData = values.existingFooterFile;

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
        const headerFile = createHtmlFile(values.headerFile, headerFileName || "header.html");
        const headerBase64 = await convertFileToBase64(headerFile);
        portalHeaderData = {
          id: uuidv4(),
          name: 'header.html',
          url: headerBase64,
          type: headerFile.type,
          size: headerFile.size,
        };
      }
      if (values.footerFile) {
        const footerFile = createHtmlFile(values.footerFile, footerFileName || "footer.html");
        const footerBase64 = await convertFileToBase64(footerFile);
        portalFooterData = {
          id: uuidv4(),
          name: 'footer.html',
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

      await updateSMTPConfigs(dataToSubmit);
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          const parsedUser = decryptedResponse.user as User;
          if (parsedUser) {
            parsedUser.organizationInfo.name = dataToSubmit.portalName;
          }
          const newToken = await signToken(parsedUser);
          Cookies.set("token", String(newToken), {
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
        <Form onSubmit={handleSubmit}>
          <div className="flex flex-col max-h-[95vh]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(95vh-140px)]">
              <div className="space-y-4 overflow-y-auto pr-2">
                {formFields.map(({ label, name, placeholder, type }) => (
                  <div key={name} className="space-y-2 my-3">
                    <Label htmlFor={name}>{label}</Label>
                    {type === "file" ? (
                      <div className="">
                        <PortalFileUpload
                          accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
                          maxFiles={1}
                          onFileSelect={(files) => {
                            setFieldValue(name, files[0]);
                            setFieldValue("existingLogo", null);
                          }}
                          files={
                            values[name]
                              ? [values[name] as File]
                              : values.existingLogo
                              ? [values.existingLogo as unknown as File]
                              : []
                          }
                          setter={(files) => {
                            setFieldValue(name, files[0]);
                            setFieldValue("existingLogo", null);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
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
                            errors[name] && touched[name]
                              ? "w-full border-red-500"
                              : "w-full"
                          }
                        />
                      </div>
                    )}
                    <ErrorMessage
                      name={name}
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                ))}

                <Card className="flex-1">
                  <CardContent className="pt-0 space-y-4 my-2">
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                          value="header"
                          className="flex items-center gap-2"
                        >
                          Header
                          <div
                            className="w-6 h-6 border border-dashed border-muted-foreground/40 rounded flex items-center justify-center hover:border-muted-foreground/70 transition-colors cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              headerFileInputRef.current?.click();
                            }}
                          >
                            <Upload className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground/70" />
                          </div>
                        </TabsTrigger>
                        <TabsTrigger
                          value="footer"
                          className="flex items-center gap-2"
                        >
                          Footer
                          <div
                            className="w-6 h-6 border border-dashed border-muted-foreground/40 rounded flex items-center justify-center hover:border-muted-foreground/70 transition-colors cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              footerFileInputRef.current?.click();
                            }}
                          >
                            <Upload className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground/70" />
                          </div>
                        </TabsTrigger>
                      </TabsList>

                      <input
                        type="file"
                        accept=".html"
                        ref={headerFileInputRef}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "header", setFieldValue)}
                      />
                      <input
                        type="file"
                        accept=".html"
                        ref={footerFileInputRef}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "footer", setFieldValue)}
                      />

                      <TabsContent value="header" className="space-y-3 mt-4">
                        <div className="space-y-2">
                          {headerFileName && (
                            <div className="text-sm text-muted-foreground">
                              Current file: {headerFileName}
                            </div>
                          )}
                          <Editor
                            height="400px"
                            defaultLanguage="html"
                            value={headerCode}
                            onChange={(value) => {
                              setHeaderCode(value || "");
                              setFieldValue("headerFile", value);
                            }}
                            options={editorOptions}
                            theme="vs-light"
                            className="font-mono text-xs min-h-[400px] border-2 rounded-md"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="footer" className="space-y-3 mt-4">
                        <div className="space-y-2">
                          {footerFileName && (
                            <div className="text-sm text-muted-foreground">
                              Current file: {footerFileName}
                            </div>
                          )}
                          <Editor
                            height="400px"
                            defaultLanguage="html"
                            value={footerCode}
                            onChange={(value) => {
                              setFooterCode(value || "");
                              setFieldValue("footerFile", value);
                            }}
                            options={editorOptions}
                            theme="vs-light"
                            className="font-mono text-xs min-h-[400px] border-2 rounded-md"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Live Preview</h3>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Preview Mode
                    </span>
                  </div>
                </div>
                <Card className="h-[94%] overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col overflow-y-scroll">
                    <div
                      dangerouslySetInnerHTML={{ __html: headerCode || "" }}
                    />
                    <div className="flex-1 bg-gray-50 flex items-center justify-center p-8">
                      <ApplyJobsContent showHeaderFooter={false} />
                    </div>
                    <div
                      dangerouslySetInnerHTML={{ __html: footerCode || "" }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-[0.28rem] sm:pt-6 md:pt-8 lg:pt-2 border-t w-full">
              <Button type="submit" disabled={isSubmitting}>
                Save Settings
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}