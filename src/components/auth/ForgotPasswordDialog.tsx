import React, { useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateResetTokenMutation } from "@/lib/features/settings/settingsApi";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrgAccount {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  isCandidate: boolean;
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
  const [orgAccounts, setOrgAccounts] = useState<OrgAccount[]>([]);
  const [step, setStep] = useState<"email" | "select-org">("email");
  const [emailValue, setEmailValue] = useState("");

  const handleEmailSubmit = async (
    values: { email: string },
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setSubmitting(true);
      setEmailValue(values.email);

      const response = await createResetToken({ email: values.email }).unwrap();

      // If multiple accounts were found
      if (response.multipleAccounts && response.accounts) {
        setOrgAccounts(response.accounts);
        setStep("select-org");
        return;
      }

      // Success - single account case
      toast({
        title: "Success",
        description: "Password reset link has been sent to your email",
        variant: "default"
      });
      setTimeout(() => onClose(), 2000);
    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "data" in err
          ? (err as any).data?.error || "Failed to send reset link."
          : "An unexpected error occurred.";

      toast({
        title: "Alert",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrgSelection = async (
    values: { selectedOrgId: string },
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      setSubmitting(true);

      // debugger
      // Send request with both email and selected organization
      await createResetToken({
        email: emailValue,
        selectedOrgId: values.selectedOrgId
      }).unwrap();

      toast({
        title: "Success",
        description: "Password reset link has been sent to your email",
        variant: "default"
      });
      setTimeout(() => {
        resetDialog();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "data" in err
          ? (err as any).data?.error || "Failed to send reset link."
          : "An unexpected error occurred.";

      toast({
        title: "Alert",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetDialog = () => {
    setStep("email");
    setOrgAccounts([]);
    setEmailValue("");
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "email" ? "Forgot Password" : "Select Organization"}
          </DialogTitle>
          {step === "select-org" && (
            <DialogDescription>
              We found your email in multiple organizations.
              Please select which account you want to reset the password for.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "email" ? (
          <Formik
            initialValues={{ email: "" }}
            validationSchema={validationSchema}
            onSubmit={handleEmailSubmit}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-4">
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
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isLoading}>
                    {isSubmitting || isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <Formik
            initialValues={{ selectedOrgId: orgAccounts.length > 0 ? orgAccounts[0].organizationId : "" }}
            onSubmit={handleOrgSelection}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Select your organization</Label>
                  <Field name="selectedOrgId">
                    {({ field, form }: any) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => form.setFieldValue("selectedOrgId", value)}
                        className="space-y-2"
                      >
                        {orgAccounts.map((account) => (
                          <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-md">
                            <RadioGroupItem value={account.organizationId} id={account.id} />
                            <div className="flex flex-col">
                              <Label htmlFor={account.id} className="font-medium">
                                {account.organizationName || "Organization"}
                              </Label>
                              <span className="text-xs text-gray-500">
                                {account.isCandidate ? "Candidate Account" : "User Account"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </Field>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("email")}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isLoading}>
                    {isSubmitting || isLoading ? "Sending..." : "Continue"}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;