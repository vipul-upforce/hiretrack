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
import { useSignupMutation } from "@/lib/features/auth/authApi";
import { FormikErrors, FormikTouched, FieldProps } from "formik";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { SignupSchema } from "../schema/Signup.schema";
import { SignupFormValues } from "@/types/signup";

export default function Signup() {
  const router = useRouter();
  const { toast } = useToast();
  const [signup, { isLoading }] = useSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initialValues: SignupFormValues = {
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
    role: "",
    organizationId: "",
  };

  const handleSubmit = async (
    values: SignupFormValues,
    { setStatus }: { setStatus: (message: string) => void }
  ) => {
    try {
      const userData = Cookies.get("token");
      if (userData) {
        const decryptedResponse = await verifyAndDecryptJWTToken(
          String(userData)
        );
        if (decryptedResponse.success && decryptedResponse.user) {
          try {
            const orgID_cookie = decryptedResponse.user.organizationId || "";
            const signupData = {
              ...values,
              organizationId: orgID_cookie,
              name: values.name.trim(),
            };
            const response = await signup(signupData).unwrap();

            if (response.user) {
              toast({
                title: "Success",
                description: "Account created successfully",
                variant: "default",
              });
              router.push("/dashboard/users");
            } else {
              throw new Error("No user data received");
            }
          } catch (error: unknown) {
            if (error && typeof error === "object" && "data" in error) {
              const errorMessage =
                (error.data as { error: string }).error ||
                "Failed to parse user data from cookie";
              throw new Error(errorMessage);
            } else {
              throw new Error("Failed to parse user data from cookie");
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        const errorMessage = err.message || "Failed to create account";
        setStatus(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
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
                      className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent ${errors.password && touched.password ? "translate-y-[-25px]" : ""}`}
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
                      className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent ${errors.confirmPassword && touched.confirmPassword ? "translate-y-[-25px]" : ""}`}
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

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Field name="role">
                    {({ field, form }: FieldProps) => (
                      <>
                        <Select
                          {...field}
                          value={field.value} // Bind Formik value
                          onValueChange={(value) =>
                            form.setFieldValue(field.name, value)
                          }
                          disabled={isLoading || isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="interviewer">
                              Interviewer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.role && touched.role && (
                          <div className="text-red-500 text-sm">
                            {errors.role}
                          </div>
                        )}
                      </>
                    )}
                  </Field>
                </div>

                <CardFooter className="px-0 pt-6 flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isSubmitting}
                  >
                    {isLoading || isSubmitting
                      ? "Creating User..."
                      : "Create User"}
                  </Button>
                </CardFooter>
              </Form>
            )}
          </Formik>
          <div className="flex justify-around">
            <Link
              href="/dashboard/users"
              className="text-blue-600 hover:underline"
            >
              Go back to User List
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
