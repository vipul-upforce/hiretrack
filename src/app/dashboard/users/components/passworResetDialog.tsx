"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Eye, EyeOff } from "lucide-react";
import { Formik, Form, Field, FieldProps } from "formik";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useResetPasswordbyAdminMutation } from "@/lib/features/auth/authApi";
import { passwordValidationSchema } from "../schemas/passwordValidation.schema";

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  name: string;
}

export function ResetPasswordDialog({
  isOpen,
  onOpenChange,
  candidateId,
  name,
}: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [resetPasswordbyAdmin, { isLoading: isReseting }] =
    useResetPasswordbyAdminMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordUpdate = async (values: { password: string }) => {
    try {
      await resetPasswordbyAdmin({
        candidateId,
        password: values.password,
      }).unwrap();

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? `Failed to reset password: ${error.message}`
            : "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {name}</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{
            password: "",
            confirmPassword: "",
          }}
          validationSchema={passwordValidationSchema}
          onSubmit={(values) =>
            handlePasswordUpdate({ password: values.password })
          }
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isSubmitting,
          }) => (
            <Form className="space-y-4 p-4">
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
                          disabled={isReseting || isSubmitting}
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
                          disabled={isReseting || isSubmitting}
                          className={
                            errors.confirmPassword && touched.confirmPassword
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors.confirmPassword && touched.confirmPassword && (
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {!showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isReseting || isSubmitting}
                  onClick={() => handleSubmit()}
                >
                  {isReseting ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
