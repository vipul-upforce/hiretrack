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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLoginMutation } from "@/lib/features/auth/authApi";
import { FormikErrors, FormikTouched, FieldProps } from "formik";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import { OrgInfo } from "@/lib/models/user";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";

interface LoginFormValues {
  email: string;
  password: string;
}
interface UserWithoutCF{
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
  organizationInfo?: OrgInfo;
}
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function Login() {
  const router = useRouter();
  const { toast } = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const { setUserLoggedIn } = useCustomFields();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const initialValues: LoginFormValues = {
    email: "",
    password: "",
  };

  const handleSubmit = async (
    values: LoginFormValues,
    { setStatus }: { setStatus: (message: string) => void }
  ) => {
    try {
      const response = await login(values).unwrap();
      if (response.user) {
        const userWithoutCustomFields:UserWithoutCF = {
          ...response.user
        };
        if (userWithoutCustomFields.organizationInfo) {
          userWithoutCustomFields.organizationInfo = {
            ...userWithoutCustomFields.organizationInfo,
          };
          delete userWithoutCustomFields.organizationInfo.customFields;
        }
        Cookies.set("user", JSON.stringify(userWithoutCustomFields), { expires: 7 }); // Expires in 7 days
        setUserLoggedIn(true);
      }
      toast({
        title: "Success",
        description: "Login successful",
        variant: "default",
      });
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "data" in err) {
        const errorMessage =
          (err.data as { error: string }).error || "Login failed";
        setStatus(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const errorMessage = "An unknown error occurred";
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
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
                    <div className="text-red-500 text-xs">{errors.password}</div>
                  )}
                </div>


                <CardFooter className="px-0 pt-6 flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isSubmitting}
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
    </div>
  );
}
