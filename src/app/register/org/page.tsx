"use client";

import { useRouter } from "next/navigation";
import { Formik, Form, Field, FieldProps } from "formik";
import * as Yup from "yup";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  CreateOrgResponse,
  useCreateOrgMutation,
} from "@/lib/features/org/orgApi";
import { Eye, EyeOff, Building2, User, Mail, Lock } from "lucide-react";
import React, { useEffect, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import withAuthGuard from "@/components/withAuthGuard";
import { useGetCaptchaConfigsQuery } from "@/lib/features/settings/settingsApi";
import { getDecodedCaptcha } from "@/hooks/useSSE";

interface OrgFormValues {
  name: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "admin";
}

const OrgSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .matches(/^(?!\s+$).*/, "Organization Name cannot be only spaces")
    .min(2, "Organization Name must be at least 2 characters")
    .max(20, "Organization name must be 20 characters or fewer")
    .required("Organization Name is required"),
  fullName: Yup.string()
    .trim()
    .matches(/^(?!\s+$).*/, "Admin name cannot be only spaces")
    .min(2, "Admin Name must be at least 2 characters long")
    .max(20, "Admin name must be 20 characters or fewer")
    .required("Admin Name is required"),
  email: Yup.string()
    .trim()
    .matches(/^[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid Email")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters.")
    .matches(/[a-z]/, "Password must include at least one lowercase letter")
    .matches(/[A-Z]/, "Password must include at least one uppercase letter")
    .matches(/\d/, "Password must include at least one number")
    .matches(
      /[@$!%*?&]/,
      "Password must include at least one special character (@$!%*?&)"
    )
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

const lanes: string[] = [];

function OrgRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [createOrg, { isLoading: isOrgLoading }] = useCreateOrgMutation();
  const [showPassword, setShowPassword] = React.useState(false);
  const [captcha, setCaptcha] = useState<string>();
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Fetch CAPTCHA configuration
  const { data: captchaConfig } = useGetCaptchaConfigsQuery(undefined);

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/organization?limit=1");
      const allowance = await data.json();

      setOrganizationId(allowance.data?.[0]?.organizationId);

      if (!allowance.allow) {
        router.push("/auth/login");
      }
    }

    checkAllowance();
  }, [router]);

  // Decrypt siteKey when captchaConfig is available
  useEffect(() => {
    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          organizationId
        );
        if (decrypted) {
          setDecryptedSiteKey(decrypted);
        }
      }
    };
    decryptSiteKey();
  }, [captchaConfig, organizationId]);

  const initialValues: OrgFormValues = {
    name: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
  };

  const handleSubmit = async (
    values: OrgFormValues,
    { setStatus }: { setStatus: (message: string) => void }
  ) => {
    if (!captcha && captchaConfig?.captcha["enableCaptcha"]) {
      toast({
        title: "Error",
        description: "Captcha not verified. Please try again",
        variant: "default",
      });
      return;
    }

    try {
      const response = await fetch("/api/license-validate", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!data.valid) {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description:
          e instanceof Error
            ? e.message
            : "License not verified. Please contact support or try re-installing the platform.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { name, email, fullName, password, role } = values;
      const adminData = { email, name: fullName, password, role };

      const orgResponse: CreateOrgResponse = await createOrg({
        name,
        lanes,
        adminData,
      }).unwrap();

      if (orgResponse.organization) {
        toast({
          title: "Success",
          description: "Admin account created successfully",
          variant: "default",
        });
        router.push("/auth/login");
      } else {
        throw new Error("Failed to create admin");
      }
    } catch (err: unknown) {
      let errorMessage = "An unknown error occurred";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "data" in err) {
        const errorObj = err as { data?: { error?: string } };
        if (errorObj.data?.error) {
          errorMessage = errorObj.data.error;
        }
      }
      setStatus(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />

      <Card className="w-full max-w-md border-border/50 shadow-xl backdrop-blur-sm z-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            Register Organization
          </CardTitle>
          <CardDescription>
            Create your workspace and admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={initialValues}
            validationSchema={OrgSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, status }) => (
              <Form className="space-y-4">
                {status && (
                  <Alert variant="destructive">
                    <AlertDescription>{status}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Field name="name">
                    {({ field }: FieldProps) => (
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          id="name"
                          placeholder="Acme Inc."
                          disabled={isSubmitting}
                          className={`pl-10 ${
                            errors.name && touched.name ? "border-red-500" : ""
                          }`}
                        />
                      </div>
                    )}
                  </Field>
                  {errors.name && touched.name && (
                    <div className="text-red-500 text-xs mt-1">
                      {errors.name}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Admin Full Name</Label>
                  <Field name="fullName">
                    {({ field }: FieldProps) => (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          id="fullName"
                          placeholder="John Doe"
                          disabled={isSubmitting}
                          className={`pl-10 ${
                            errors.fullName && touched.fullName
                              ? "border-red-500"
                              : ""
                          }`}
                        />
                      </div>
                    )}
                  </Field>
                  {errors.fullName && touched.fullName && (
                    <div className="text-red-500 text-xs mt-1">
                      {errors.fullName}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <Field name="email">
                    {({ field }: FieldProps) => (
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          placeholder="admin@example.com"
                          disabled={isSubmitting}
                          className={`pl-10 ${
                            errors.email && touched.email
                              ? "border-red-500"
                              : ""
                          }`}
                        />
                      </div>
                    )}
                  </Field>
                  {errors.email && touched.email && (
                    <div className="text-red-500 text-xs mt-1">
                      {errors.email}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Field name="password">
                        {({ field }: FieldProps) => (
                          <>
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              id="password"
                              type={showPassword ? "text" : "password"}
                              disabled={isSubmitting}
                              className={`pl-10 pr-10 ${
                                errors.password && touched.password
                                  ? "border-red-500"
                                  : ""
                              }`}
                            />
                          </>
                        )}
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.password && touched.password && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.password}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm</Label>
                    <div className="relative">
                      <Field name="confirmPassword">
                        {({ field }: FieldProps) => (
                          <>
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              disabled={isSubmitting}
                              className={`pl-10 pr-10 ${
                                errors.confirmPassword &&
                                touched.confirmPassword
                                  ? "border-red-500"
                                  : ""
                              }`}
                            />
                          </>
                        )}
                      </Field>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>
                </div>

                {captchaConfig?.captcha?.enableCaptcha && decryptedSiteKey && (
                  <div className="flex justify-center pt-2">
                    <div className="recaptcha-container transform scale-90">
                      <ReCAPTCHA
                        sitekey={decryptedSiteKey}
                        onChange={(token) => setCaptcha(token ?? undefined)}
                      />
                    </div>
                  </div>
                )}

                <CardFooter className="px-0 pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    variant="primary"
                    disabled={
                      isSubmitting ||
                      isOrgLoading ||
                      (captchaConfig?.captcha?.enableCaptcha && !captcha)
                    }
                  >
                    {isSubmitting || isOrgLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Registering...</span>
                      </div>
                    ) : (
                      "Register Organization"
                    )}
                  </Button>
                </CardFooter>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuthGuard(OrgRegisterPage, {
  requiredRoles: [],
  fallbackPath: "/auth/login",
  checkAllowance: true,
  allowAuthenticated: true,
});
