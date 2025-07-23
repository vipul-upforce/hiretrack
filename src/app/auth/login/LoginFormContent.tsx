"use client";

import { useRouter } from "next/navigation";
import { Formik, Form, Field } from "formik";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormikErrors, FormikTouched, FieldProps } from "formik";
import Cookies from "js-cookie";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import OrganizationDialog, {
  OneOfMulOrganization,
} from "@/components/auth/OrganizationDialog";
import ReCAPTCHA from "react-google-recaptcha";
import { LoginFormValues } from "@/types/login";
import { LoginSchema } from "../schema/Login.schema";
import { useHandleLoginSubmit } from "../hooks/useLoginSubmit";
import { useTheme } from "@/components/theme-provider";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import "./recaptcha-theme.css";

export default function LoginFormContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OneOfMulOrganization[]>(
    []
  );
  const [loginFormValues, setLoginFormValues] = useState<LoginFormValues>();
  const [selectedOrg, setSelectedOrg] = useState<string>();
  const [captcha, setCaptcha] = useState<string>();
  const [isMultiple, setIsMultiple] = useState<boolean>(false);
  const [portalLogo, setPortalLogo] = useState<string | null>(null);
  const [portalName, setPortalName] = useState<string>("");

  const initialValues: LoginFormValues = {
    email: "",
    password: "",
  };

  // useHandleLoginSubmit, which uses useSearchParams, is now called within this client component
  const { handleSubmit, isLoading } = useHandleLoginSubmit({
    selectedOrg,
    isMultiple,
    setOrganizations,
    setOrganizationDialogOpen,
    setLoginFormValues,
  });

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/organization");
      if (data.ok) {
        const allowance = await data.json();
        if (allowance.allow) {
          setIsMultiple(true);
        }
      }
    }
    checkAllowance();
  }, []);

  // Fetch portal settings for logo and name
  useEffect(() => {
    async function fetchPortalSettings() {
      try {
        const response = await fetch("/api/settings/portal");
        if (response.ok) {
          const data = await response.json();
          setPortalLogo(data.portalLogo?.url || null);
          setPortalName(data.portalName || "");
        }
      } catch (error) {
        console.error("Failed to fetch portal settings:", error);
      }
    }
    fetchPortalSettings();
  }, []);

  // Get default logo based on theme
  const getDefaultLogo = () => {
    return theme === "dark" ? "/logo_dark.png" : "/logo.png";
  };

  // Get logo URL with fallback
  const getLogoUrl = () => {
    return portalLogo || getDefaultLogo();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative">
      {/* Theme Toggle in top right corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background/90"
        />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          {/* Logo Section */}
          <div className="flex justify-center mb-4">
            <div className="relative w-72 h-36">
              <Image
                src={getLogoUrl()}
                alt={portalName || "HireTrack"}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold flex flex-row justify-between items-center">
            Login
            {selectedOrg && (
              <span
                className="text-lg font-medium text-muted-foreground cursor-pointer"
                style={{
                  animation: selectedOrg
                    ? "fadeInOrg 0.9s ease-in-out forwards"
                    : "none",
                }}
                onClick={() => {
                  setSelectedOrg("");
                  setOrganizationDialogOpen(true);
                }}
              >
                {organizations.find((org) => org.orgId === selectedOrg)?.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={initialValues}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({
              errors,
              touched,
              isSubmitting,
              status,
            }: {
              errors: FormikErrors<LoginFormValues>;
              touched: FormikTouched<LoginFormValues>;
              isSubmitting: boolean;
              status?: string;
            }) => (
              <Form className="space-y-4">
                {status && (
                  <Alert variant="destructive">
                    <AlertDescription>{status}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Field name="email">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        disabled={isLoading || isSubmitting}
                        className={
                          errors.email && touched.email ? "border-red-500" : ""
                        }
                      />
                    )}
                  </Field>
                  {errors.email && touched.email && (
                    <div className="text-red-500 text-xs">{errors.email}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          {...field}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          disabled={isLoading || isSubmitting}
                          className={
                            errors.password && touched.password
                              ? "border-red-500"
                              : ""
                          }
                        />
                      )}
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {!showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && touched.password && (
                    <div className="text-red-500 text-xs">
                      {errors.password}
                    </div>
                  )}
                </div>

                {/* Custom styled reCAPTCHA */}
                <div className="flex justify-center">
                  <div className="recaptcha-container">
                    <ReCAPTCHA
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                      onChange={(token) => {
                        if (token) setCaptcha(token);
                      }}
                      theme={theme as "light" | "dark"}
                    />
                  </div>
                </div>

                <CardFooter className="px-0 pt-6 flex-col space-y-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full font-medium"
                    disabled={isLoading || isSubmitting || !captcha}
                  >
                    {isLoading || isSubmitting ? "Logging in..." : "Login"}
                  </Button>
                  <div className="flex justify-end w-full p-0">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary p-0"
                      onClick={() => setForgotPasswordOpen(true)}
                    >
                      Forgot Password?
                    </Button>
                  </div>
                </CardFooter>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />

      {loginFormValues && !selectedOrg && (
        <OrganizationDialog
          isOpen={organizationDialogOpen}
          onClose={() => setOrganizationDialogOpen(false)}
          data={{ ...loginFormValues, organizations }}
          setSelectedOrgId={(orgId: string) => setSelectedOrg(orgId)}
        />
      )}
    </div>
  );
}
