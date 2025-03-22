import React from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateResetTokenMutation } from "@/lib/features/settings/settingsApi";
import { toast } from "@/hooks/use-toast";

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
});

const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [createResetToken, { isLoading }] = useCreateResetTokenMutation();

  const handleSubmit = async (
    values: { email: string },
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setSubmitting(true);
      await createResetToken({ email: values.email }).unwrap();
      // setStatus("Password reset link has been sent to your email");
      toast({
        title:"Success",
        description:"Password reset link has been sent to your email",
        variant:"default"
      })
      setTimeout(() => onClose(), 2000);
    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "data" in err
          ? (err as any).data?.error || "Failed to send reset link."
          : "An unexpected error occurred.";
      // setStatus(errorMessage);
      toast({
        title:"Alert",
        description:errorMessage,
        variant:"destructive"
      })
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forgot Password</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{ email: "" }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting, status }) => (
            <Form className="space-y-4">
              {/* {status && (
                <Alert variant={error ? "destructive" : "default"}>
                  <AlertDescription>{status}</AlertDescription>
                </Alert>
              )} */}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Field name="email">
                  {({ field }: any) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      disabled={isSubmitting || isLoading}
                      className={errors.email && touched.email ? "border-red-500" : ""}
                    />
                  )}
                </Field>
                {errors.email && touched.email && (
                  <div className="text-red-500 text-xs">{errors.email}</div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting || isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
