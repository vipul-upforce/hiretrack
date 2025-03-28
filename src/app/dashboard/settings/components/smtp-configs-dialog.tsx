"use client"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import { Eye, EyeOff } from "lucide-react";
import { useGetSMTPConfigsQuery, useUpdateSMTPConfigsMutation } from "@/lib/features/settings/settingsApi";
import { useState } from "react";
import { useTestConnection } from "@/hooks/use-test-connection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SMTPConfigs({ onClose }: { onClose: () => void }) {
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    
    const { testConnection, isConnectionSuccessful, isTesting } = useTestConnection();
  
    const { data, isLoading, refetch } = useGetSMTPConfigsQuery(undefined);
    const [updateSMTPConfigs, { isLoading: isUpdating }] = useUpdateSMTPConfigsMutation();
  
    const initialValues = data ?? {
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      SMTP_HOST: "",
      SMTP_PORT: "",
      SMTP_FROM: "",
    };
  
    const validationSchema = Yup.object({
      SMTP_HOST: Yup.string().trim().required("SMTP Host is required"),
      SMTP_PORT: Yup.string().trim().required("SMTP Port is required"),
      SMTP_USER: Yup.string().trim().email("Must be a valid email").required("SMTP User is required"),
      SMTP_PASSWORD: Yup.string().trim().required("SMTP Password is required"),
      SMTP_FROM: Yup.string().trim().email("Must be a valid email").required("SMTP From is required"),
    });
  
    const handleSubmit = async (values: typeof initialValues) => {
      try {
        await updateSMTPConfigs(values).unwrap();
        toast({ title: "Success", description: "SMTP settings updated successfully" });
        refetch()
        onClose()
      } catch {
        toast({ title: "Error", description: "Failed to update SMTP settings", variant: "destructive" });
      }
    };
    
    const handleTestConnection = async (values: typeof initialValues) => {
      await testConnection('smtp', {
        host: values.SMTP_HOST,
        port: values.SMTP_PORT,
        from: values.SMTP_FROM,
        // Map SMTP form fields to the credentials expected by our hook
        user: values.SMTP_USER,
        pass: values.SMTP_PASSWORD,
      });
    };
  
    if (isLoading) return <div>Loading...</div>;
  
    const formFields = [
      {
        label: "SMTP Host",
        name: "SMTP_HOST",
        placeholder: "e.g., smtp.gmail.com"
      },
      {
        label: "SMTP Port",
        name: "SMTP_PORT",
        placeholder: "e.g., 587"
      },
      {
        label: "SMTP User",
        name: "SMTP_USER",
        placeholder: "Email address"
      },
      {
        label: "Displayed Sender Email",
        name: "SMTP_FROM",
        placeholder: "Sender email for recipients"
      },
    ]
  
    return (
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
        {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
          <Form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map(({ label, name, placeholder }) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} name={name} value={values[name]} onChange={handleChange} onBlur={handleBlur} placeholder={placeholder} />
                <ErrorMessage name={name} component="div" className="text-red-500 text-sm" />
              </div>
            ))}

            <div className="space-y-2 relative">
              <Label htmlFor="SMTP_PASSWORD">SMTP Password</Label>
              <div className="relative">
                <Input
                  id="SMTP_PASSWORD"
                  name="SMTP_PASSWORD"
                  type={showPassword ? "text" : "password"}
                  value={values.SMTP_PASSWORD}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Password"
                />
                <button type="button" className="absolute right-3 top-2.5 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <ErrorMessage name="SMTP_PASSWORD" component="div" className="text-red-500 text-sm" />
            </div>

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

            <div className="w-full flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting || isUpdating || !isConnectionSuccessful}
                        title={!isConnectionSuccessful ? "Test the connection before saving." : ""}
                      >
                        {isSubmitting || isUpdating ? "Saving..." : "Save Settings"}
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
    );
  }