"use client";

import { useRouter } from "next/navigation";
import { Formik, Form, Field } from "formik";
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
import { FormikErrors, FormikTouched, FieldProps } from "formik";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useCandidateSignupMutation } from "@/lib/features/candidate/candidateApi";
import ReCAPTCHA from "react-google-recaptcha";
import { useSearchParams } from "next/navigation";

interface SignupFormValues {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  organizationInfo?: { name: string };
}

const SignupSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
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
  name: Yup.string()
    .required("Name is required")
    .trim()
    .matches(/^(?!\s+$).*/, "Name cannot be only spaces")
    .min(2, "Name must be at least 2 characters long")
    .max(20, "Name cannot exceed 20 characters"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

// Create a separate client component for the form
const SignupForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [signup, { isLoading }] = useCandidateSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgName, setOrgName] = useState<string | undefined>();
  const [captcha, setCaptcha] = useState<string | undefined>();

  const initialValues: SignupFormValues = {
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  };

  // Extract orgName from query string
  useEffect(() => {
    if (typeof window !== "undefined") {
      const orgNameFromQuery = searchParams.get("orgName");
      if (orgNameFromQuery) {
        setOrgName(decodeURIComponent(orgNameFromQuery));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/organization");
      if (!data.ok) {
        const allowance = await data.json();
        if (!allowance.allow) {
          router.push("/signup");
        }
      }
    }
    checkAllowance();
  }, []);

  const handleSubmit = async (
    values: SignupFormValues,
    { setStatus }: { setStatus: (message: string) => void }
  ) => {
    try {
      // debugger;
      const signupData = {
        ...values,
        name: values.name.trim(),
        ...(orgName && { orgName: orgName }),
      };
      const response = await signup(signupData).unwrap();

      if (response.user) {
        toast({
          title: "Success",
          description: "Account created successfully",
          variant: "default",
        });
        router.push("/auth/login");
      } else {
        throw new Error("No user data received");
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to create account";
      if (error && typeof error === "object" && "data" in error) {
        errorMessage =
          (error.data as { error: string }).error ||
          "Failed to parse user data from cookie";
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
          <CardTitle className="text-2xl font-bold flex flex-row justify-between items-center">
            Create Account
            {orgName && (
              <span
                className="text-lg font-medium text-gray-700"
                style={{
                  animation: orgName
                    ? "fadeInOrg 0.9s ease-in-out forwards"
                    : "none",
                }}
              >
                {orgName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={initialValues}
            validationSchema={SignupSchema}
            onSubmit={handleSubmit}
          >
            {({
              errors,
              touched,
              isSubmitting,
            }: {
              errors: FormikErrors<SignupFormValues>;
              touched: FormikTouched<SignupFormValues>;
              isSubmitting: boolean;
            }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Field name="name">
                    {({ field }: FieldProps) => (
                      <>
                        <Input
                          {...field}
                          id="name"
                          type="text"
                          disabled={isLoading || isSubmitting}
                          className={
                            errors.name && touched.name ? "border-red-500" : ""
                          }
                        />
                        {errors.name && touched.name && (
                          <div className="text-red-500 text-sm">
                            {errors.name}
                          </div>
                        )}
                      </>
                    )}
                  </Field>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Field name="email">
                    {({ field }: FieldProps) => (
                      <>
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          disabled={isLoading || isSubmitting}
                          className={
                            errors.email && touched.email
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors.email && touched.email && (
                          <div className="text-red-500 text-sm">
                            {errors.email}
                          </div>
                        )}
                      </>
                    )}
                  </Field>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <>
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
                          {errors.password && touched.password && (
                            <div className="text-red-500 text-sm">
                              {errors.password}
                            </div>
                          )}
                        </>
                      )}
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent ${
                        errors.password && touched.password
                          ? "translate-y-[-25px]"
                          : ""
                      }`}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {!showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Field name="confirmPassword">
                      {({ field }: FieldProps) => (
                        <>
                          <Input
                            {...field}
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            disabled={isLoading || isSubmitting}
                            className={
                              errors.confirmPassword && touched.confirmPassword
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {errors.confirmPassword &&
                            touched.confirmPassword && (
                              <div className="text-red-500 text-sm">
                                {errors.confirmPassword}
                              </div>
                            )}
                        </>
                      )}
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent ${
                        errors.confirmPassword && touched.confirmPassword
                          ? "translate-y-[-25px]"
                          : ""
                      }`}
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {!showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={(token) => {
                    if (token) setCaptcha(token);
                  }}
                />
                <CardFooter className="px-0 pt-6 flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !captcha || isSubmitting}
                  >
                    {isLoading || isSubmitting ? "Registering..." : "Sign Up"}
                  </Button>
                </CardFooter>
              </Form>
            )}
          </Formik>
          <div className="flex justify-center">
            Already have a candidate account?
            <Link
              href="/auth/login"
              className="text-blue-600 ml-1 hover:underline"
            >
              Login here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main page component
export default function Signup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
