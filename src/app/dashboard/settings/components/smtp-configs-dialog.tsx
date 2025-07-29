"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import { Eye, EyeOff } from "lucide-react";
import {
  useGetSMTPConfigsQuery,
  useUpdateSMTPConfigsMutation,
} from "@/lib/features/settings/settingsApi";
import { useEffect, useState } from "react";
import { useTestConnection } from "@/hooks/use-test-connection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mailProviders = [
  { key: "", label: "Select Mail Providers" },
  { key: "smtp", label: "SMTP" },
  { key: "resend", label: "Resend" },
  { key: "brevo", label: "Brevo" },
];

export default function SMTPConfigs({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const { testConnection, isConnectionSuccessful, isTesting } =
    useTestConnection();

  const { data, isLoading, refetch } = useGetSMTPConfigsQuery(undefined);
  useEffect(() => {
    refetch();
  }, []);
  const [updateSMTPConfigs, { isLoading: isUpdating }] =
    useUpdateSMTPConfigsMutation();

  const initialValues = data ?? {
    mailProvider: "",
    smtp_user: "",
    smtp_password: "",
    smtp_host: "",
    smtp_port: "",
    smtp_from: "",
    resend_api_key: "",
    resend_from: "",
    resend_reply_to: "",
    brevo_api_key: "",
    brevo_from: "",
    brevo_reply_to: "",
  };

  const validationSchema = Yup.object({
    mailProvider: Yup.string()
      .oneOf(
        mailProviders.map((option) => option.key),
        "Invalid email service provider"
      )
      .required("Email service provider is required"),

    smtp_host: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "smtp",
        then: (schema) => schema.required("SMTP Host is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    smtp_port: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "smtp",
        then: (schema) => schema.required("SMTP Port is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    smtp_user: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "smtp",
        then: (schema) =>
          schema
            .email("Must be a valid email")
            .required("SMTP User is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    smtp_password: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "smtp",
        then: (schema) => schema.required("SMTP Password is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    smtp_from: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "smtp",
        then: (schema) =>
          schema
            .email("Must be a valid email")
            .required("SMTP From is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    resend_api_key: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "resend",
        then: (schema) => schema.required("Resend API Key is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    resend_from: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "resend",
        then: (schema) =>
          schema
            .email("Must be a valid email")
            .required("Resend From is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    resend_reply_to: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "resend",
        then: (schema) =>
          schema
            .email("Must be a valid email")
            .required("Resend Reply To is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
    brevo_api_key: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "brevo",
        then: (schema) => schema.required("Brevo API Key is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    brevo_from: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "brevo",
        then: (schema) =>
          schema
            .email("Must be a valid email")
            .required("Brevo From is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    brevo_reply_to: Yup.string()
      .trim()
      .when("mailProvider", {
        is: (mailProvider: unknown) => mailProvider === "brevo",
        then: (schema) =>
          schema
            .email("Must be a valid email")
            .required("Brevo Reply To is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
  });

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      await updateSMTPConfigs(values).unwrap();
      toast({
        title: "Success",
        description: "SMTP settings updated successfully",
      });
      refetch();
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update SMTP settings",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (values: typeof initialValues) => {
    const credentials =
      values.mailProvider === "resend"
        ? {
            resend_api_key: values.resend_api_key,
            resend_from: values.resend_from,
            reply_to: values.resend_reply_to,
          }
        : values.mailProvider === "brevo"
          ? {
              brevo_api_key: values.brevo_api_key,
              brevo_from: values.brevo_from,
              reply_to: values.brevo_reply_to,
            }
          : {
              host: values.smtp_host,
              port: values.smtp_port,
              from: values.smtp_from,
              user: values.smtp_user,
              pass: values.smtp_password,
            };

    await testConnection(values.mailProvider, credentials);
  };
  if (isLoading) return <div className="px-6 py-4">Loading...</div>;

  const formFields = [
    {
      label: "SMTP Host",
      name: "smtp_host",
      placeholder: "e.g., smtp.gmail.com",
      condition: "smtp",
    },
    {
      label: "SMTP Port",
      name: "smtp_port",
      placeholder: "e.g., 587",
      condition: "smtp",
    },
    {
      label: "SMTP User",
      name: "smtp_user",
      placeholder: "Email address",
      condition: "smtp",
    },
    {
      label: "Displayed Sender Email",
      name: "smtp_from",
      placeholder: "Sender email for recipients",
      condition: "smtp",
    },
    {
      label: "API Key",
      name: "resend_api_key",
      placeholder: "Resend API Key",
      condition: "resend",
    },
    {
      label: "From",
      name: "resend_from",
      placeholder: "Resend From Email",
      condition: "resend",
    },
    {
      label: "Reply To",
      name: "resend_reply_to",
      placeholder: "Resend Reply To Email",
      condition: "resend",
    },
    {
      label: "API Key",
      name: "brevo_api_key",
      placeholder: "Brevo API Key",
      condition: "brevo",
    },
    {
      label: "From",
      name: "brevo_from",
      placeholder: "Brevo From Email",
      condition: "brevo",
    },
    {
      label: "Reply To",
      name: "brevo_reply_to",
      placeholder: "Brevo Reply To Email",
      condition: "brevo",
    },
  ];

  return (
    <>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
          <Form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mailProvider">Mail Provider</Label>
                <Select
                  value={values.mailProvider}
                  onValueChange={(value) => setFieldValue("mailProvider", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mail provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {mailProviders.filter(p => p.key !== "").map((provider) => (
                      <SelectItem key={provider.key} value={provider.key}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorMessage
                  name="mailProvider"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {formFields
                .filter((field) => field.condition === values.mailProvider)
                .map(({ label, name, placeholder }) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name}>{label}</Label>
                    <Input
                      id={name}
                      name={name}
                      value={values[name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder={placeholder}
                    />
                    <ErrorMessage
                      name={name}
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                ))}

              {values.mailProvider === "smtp" && (
                <div className="space-y-2 relative">
                  <Label htmlFor="smtp_password">SMTP Password</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      name="smtp_password"
                      type={showPassword ? "text" : "password"}
                      value={values.smtp_password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {!showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <ErrorMessage
                    name="smtp_password"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>
              )}

              {values.mailProvider && (
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTestConnection(values)}
                    disabled={isTesting}
                  >
                    {isTesting ? "Testing..." : "Test Connection"}
                  </Button>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        type="submit"
                        variant="default"
                        disabled={
                          isSubmitting || isUpdating || !isConnectionSuccessful
                        }
                        title={
                          !isConnectionSuccessful
                            ? "Test the connection before saving."
                            : ""
                        }
                      >
                        {isSubmitting || isUpdating ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test Connection To Make It Enable</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
