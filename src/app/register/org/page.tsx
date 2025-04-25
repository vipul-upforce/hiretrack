"use client";

import { useRouter } from "next/navigation";
import { Formik, Form, Field, FieldProps } from "formik";
import * as Yup from "yup";
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
import { useToast } from "@/hooks/use-toast";
import {
  CreateOrgResponse,
  useCreateOrgMutation,
} from "@/lib/features/org/orgApi";
import { Eye, EyeOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

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
    .required("Organization Name is required")
    .trim()
    .matches(/^(?!\s+$).*/, "Organization Name cannot be only spaces")
    .min(2, "Organization Name must be at least 2 characters long")
    .max(20, "Organization Name cannot exceed 20 characters")
    .required("Organization Name is required"),
  fullName: Yup.string()
    .required("Admin Name is required")
    .trim()
    .matches(/^(?!\s+$).*/, "Admin Name cannot be only spaces")
    .min(2, "Admin Name must be at least 2 characters long")
    .max(20, "Admin Name cannot exceed 20 characters")
    .required("Admin Name is required"),
  email: Yup.string()
    .required("Email is required")
    .trim("email cannot be only spaces")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid Email"
    ),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters long")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/\d/, "Password must contain at least one number")
    .matches(
      /[@$!%*?&]/,
      "Password must contain at least one special character (@$!%*?&)"
    )
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

const lanes: string[] = [];

export default function OrgRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [createOrg, { isLoading: isOrgLoading }] = useCreateOrgMutation();
  const [showPassword, setShowPassword] = React.useState(false);
  const [captcha, setCaptcha] = useState<string>();
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/organization");
      const allowance = await data.json();
      if (!allowance.allow) {
        router.push("/auth/login");
      }
    }
    checkAllowance();
  }, []);

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
    if (!captcha) {
      toast({
        title: "Error",
        description: "Captcha Not Verified",
        variant: "default",
      });
    }
    try {
      const { name, email, fullName, password, role } = values;
      const adminData = { email, name: fullName, password, role };

      // Create the admin
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
        if (
          errorObj.data &&
          typeof errorObj.data === "object" &&
          "error" in errorObj.data
        ) {
          errorMessage = errorObj.data.error || errorMessage;
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Register Organization
          </CardTitle>
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
                      <Input
                        {...field}
                        id="name"
                        type="text"
                        disabled={isSubmitting}
                        className={
                          errors.name && touched.name ? "border-red-500" : ""
                        }
                      />
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
                      <Input
                        {...field}
                        id="fullName"
                        type="text"
                        disabled={isSubmitting}
                        className={
                          errors.fullName && touched.fullName
                            ? "border-red-500"
                            : ""
                        }
                      />
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
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        disabled={isSubmitting}
                        className={
                          errors.email && touched.email ? "border-red-500" : ""
                        }
                      />
                    )}
                  </Field>
                  {errors.email && touched.email && (
                    <div className="text-red-500 text-xs mt-1">
                      {errors.email}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password</Label>
                  <div className="relative">
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          {...field}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          disabled={isSubmitting}
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
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {!showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
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
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Field name="confirmPassword">
                      {({ field }: FieldProps) => (
                        <Input
                          {...field}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          disabled={isSubmitting}
                          className={
                            errors.confirmPassword && touched.confirmPassword
                              ? "border-red-500"
                              : ""
                          }
                        />
                      )}
                    </Field>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {!showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <div className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword}
                    </div>
                  )}
                </div>

                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={(token) => {
                    token && setCaptcha(token);
                  }}
                />

                <CardFooter className="px-0 pt-6 flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !captcha}
                  >
                    {isSubmitting || isOrgLoading
                      ? "Registering..."
                      : "Register Organization"}
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
