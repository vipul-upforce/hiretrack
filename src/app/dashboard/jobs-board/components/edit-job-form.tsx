"use client";

import { Formik, Form } from "formik";
import { jobSchema } from "../schemas/job-schema";
import { JobForm } from "./job-form";
import { Button } from "@/components/ui/button";
import { useUpdateJobMutation } from "@/lib/features/job/jobApi";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import useCustomForm, {
  CustomFieldValues,
} from "@/Custom_Fields/hooks/useCustomForm";
import CustomFields from "@/Custom_Fields/Components/CustomFields";

interface Job {
  _id: string;
  title: string;
  // company: string;
  description: string;
  skills: string[];
  experience: number;
  links: string[];
  // validTill: Date;
  status: "open" | "closed" | "draft";
  candidateCount?: number;
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
    openedAt?: Date;
    closedAt?: Date;
    updatedAt: Date;
  };
  customFields: CustomFieldValues;
}

interface EditJobFormProps {
  job: Job;
  onSave: (job: Job) => void;
  onCancel: () => void;
}

interface JobFormValues extends Omit<Job, "attachments"> {
  files: {
    id: string;
    name: string;
    url: string;
    type: "pdf";
    size: number;
  }[];
  images: {
    id: string;
    name: string;
    url: string;
    type: "image";
    size: number;
  }[];
  removedFiles: string[];
  removedImages: string[];
  customFields: CustomFieldValues;
}

type FileOrAttachment =
  | File
  | {
      id: string;
      name: string;
      url: string;
      type: "pdf" | "image";
      size: number;
    };

const convertFileToBase64 = (file: FileOrAttachment): Promise<string> => {
  if (file instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
  return Promise.resolve(file.url);
};

export function EditJobForm({ job, onSave, onCancel }: EditJobFormProps) {
  const formName = "Job Position";
  const { validationSchema, getDefaultValues } = useCustomForm(formName);
  const [updateJob] = useUpdateJobMutation();
  const { toast } = useToast();

  const initialValues: JobFormValues = {
    ...job,
    files: job.attachments.files, // Start with empty arrays for new files
    images: job.attachments.images,
    removedFiles: [],
    removedImages: [],
    customFields: { ...getDefaultValues(job.customFields || {}) },
  };

  // console.log(job, "job");

  const onSubmit = async (values: JobFormValues) => {
    const fileNames = values.files.map(file => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    if (hasDuplicates) {
      toast({
        title:"Alert",
        description:"Duplicate file names found! Please rename before submitting.",
        variant:"destructive"
      });
      return;
    }
    const updatedJob = {
      ...values,
      candidateCount: job.candidateCount || 0,
      attachments: {
        files: [
          ...((await Promise.all(
            values.files.map(async (file) => {
              const base64 = await convertFileToBase64(file);
              return {
                id: uuidv4(),
                name: file.name,
                url: base64,
                type: "pdf" as const,
                size: file.size,
              };
            })
          )) || []),
        ],
        images: [
          ...((await Promise.all(
            values.images.map(async (image) => {
              const base64 = await convertFileToBase64(image);
              return {
                id: uuidv4(),
                name: image.name,
                url: base64,
                type: "image" as const,
                size: image.size,
              };
            })
          )) || []),
        ],
      },
      tracking: {
        ...job.tracking,
        updatedAt: new Date(),
      },
    };

    try {
      await updateJob({ ...updatedJob, _id: job._id }).unwrap();
      onSave(updatedJob);
    } catch (error) {
      if (typeof error === "object" && error !== null && "data" in error) {
        const errorData = (error as { data?: { error?: string } }).data;
    
        if (typeof errorData === "object" && errorData !== null && "error" in errorData) {
          toast({
            title: "Error",
            description: errorData.error || "Failed to update job",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Error",
        description: "Failed to update job due to an unexpected error.",
        variant: "destructive",
      });
    }
    
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={jobSchema(validationSchema)}
      onSubmit={onSubmit}
    >
      {({ isSubmitting, setFieldValue, values, errors }) => (
        <Form className="flex flex-col h-[calc(90vh-80px)] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-4">
            <JobForm
              job={job}
              onRemoveExistingFile={(fileId) => {
                setFieldValue("removedFiles", [
                  ...(values.removedFiles ?? []),
                  fileId,
                ]);
              }}
              onRemoveExistingImage={(imageId) => {
                setFieldValue("removedImages", [
                  ...(values.removedImages || []),
                  imageId,
                ]);
              }}
            />
            <CustomFields formName={formName} />
          </div>
          <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
