"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Formik, Form, FormikHelpers } from "formik";
import { JobFormValues, jobSchema } from "../schemas/job-schema";
import { useState } from "react";
import { JobForm } from "./job-form";
import CustomFields from "@/Custom_Fields/Components/CustomFields";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { scrollToError } from "./edit-job-form";

interface CreateJobDialogProps {
  onJobCreated: (
    job: JobFormValues & {
      status: "draft";
      attachments: {
        files: Array<{
          id: string;
          name: string;
          url: string; // Base64 string
          type: "pdf";
          size: number;
        }>;
        images: Array<{
          id: string;
          name: string;
          url: string; // Base64 string
          type: "image";
          size: number;
        }>;
      };
      tracking: {
        createdAt: Date;
        openedAt: Date;
        updatedAt: Date;
      };
      candidateCount: number;
    }
  ) => void;
  userRole?: string;
}

// export const scrollToError = (errors: Record<string, any>) => {
//   if (!errors || typeof errors !== "object") return;

//   const findFirstKey = (
//     obj: Record<string, any>,
//     prefix = ""
//   ): string | null => {
//     for (const key in obj) {
//       if (typeof obj[key] === "string") {
//         return prefix ? `${prefix}.${key}` : key;
//       } else if (typeof obj[key] === "object") {
//         const nested = findFirstKey(
//           obj[key],
//           prefix ? `${prefix}.${key}` : key
//         );
//         if (nested) return nested;
//       }
//     }
//     return null;
//   };

//   const firstErrorKey = findFirstKey(errors);
//   if (!firstErrorKey) return;

//   // Replace dots with escaped selector for nested names (e.g., customFields.name)
//   const selector = `[name="${firstErrorKey}"], [title="${firstErrorKey}"]`;

//   const element = document.querySelector(selector) as HTMLElement;

//   if (element) {
//     element.scrollIntoView({ behavior: "smooth", block: "end" });
//     element.focus?.({ preventScroll: true });
//   }
// };

export function CreateJobDialog({
  onJobCreated,
  userRole,
}: CreateJobDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const formName = "Job Position";

  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    undefined,
    undefined,
    true
  );

  if (userRole !== "hr" && userRole !== "admin") {
    return null;
  }

  const initialValues: JobFormValues = {
    _id: "",
    title: "",
    // company: "",
    description: "",
    skills: [] as string[],
    salary: {
      min: 0,
      max: 0,
      inText: "",
      isPrivate: false,
    },
    experience: 0,
    links: [] as string[],
    // validTill: new Date(),
    files: [] as File[],
    images: [] as File[],
    removedFiles: [] as string[],
    removedImages: [] as string[],
    customFields: { ...inits },
  };

  const handleSubmit = async (
    values: JobFormValues,
    { resetForm, setSubmitting }: FormikHelpers<JobFormValues>
  ) => {
    console.log(values);

    const fileNames = values.files.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    if (hasDuplicates) {
      toast({
        title: "Alert",
        description:
          "Duplicate file names found! Please rename before submitting.",
        variant: "destructive",
      });
      return;
    }
    try {
      const newJob = {
        ...values,
        status: "draft" as const,
        candidateCount: 0,
        attachments: {
          files:
            (await Promise.all(
              values.files.map(async (file) => {
                const base64 = await convertFileToBase64(file);
                return {
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name,
                  url: base64, // Store Base64 string
                  type: "pdf" as const,
                  size: file.size,
                };
              })
            )) || [],
          images:
            (await Promise.all(
              values.images.map(async (image) => {
                const base64 = await convertFileToBase64(image);
                return {
                  id: Math.random().toString(36).substr(2, 9),
                  name: image.name,
                  url: base64, // Store Base64 string
                  type: "image" as const,
                  size: image.size,
                };
              })
            )) || [],
        },
        tracking: {
          createdAt: new Date(),
          openedAt: new Date(),
          updatedAt: new Date(),
        },
      };
      onJobCreated(newJob);
      resetForm();
      setIsOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const validationSchemas = jobSchema(validationSchema);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="">
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-center ">
        <DialogHeader className="px-6 py-2 pb-0">
          <DialogTitle className="text-lg font-semibold">
            Create New Job Position
          </DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new job listing.
          </DialogDescription>
        </DialogHeader>
        <Formik
          initialValues={initialValues as JobFormValues}
          validationSchema={validationSchemas}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="flex flex-col h-[calc(90vh-80px)] overflow-hidden ">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 sticky top-0">
                <JobForm />
                <CustomFields formName={formName} />
              </div>
              <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={() => scrollToError(errors)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Create Job"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
