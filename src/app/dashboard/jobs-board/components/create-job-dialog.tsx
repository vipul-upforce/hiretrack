'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Formik, Form, FormikHelpers } from 'formik';
import { useState } from 'react';
import CustomFields from '@/Custom_Fields/Components/CustomFields';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
import { scrollToError } from '@/lib/formUtils';
import { JobForm } from './job-form';
import { JobFormValues, jobSchema } from '../schemas/job-schema';

interface CreateJobDialogProps {
  onJobCreated: (
    job: JobFormValues & {
      status: 'draft' | 'open' | 'closed';
      attachments: {
        files: Array<{
          id: string;
          name: string;
          url: string; // Base64 string
          type: 'pdf';
          size: number;
        }>;
        images: Array<{
          id: string;
          name: string;
          url: string; // Base64 string
          type: 'image';
          size: number;
        }>;
      };
      tracking: {
        createdAt: Date;
        openedAt: Date;
        updatedAt: Date;
      };
      candidateCount: number;
    },
  ) => void;
  userRole?: string;
}

export function CreateJobDialog({
  onJobCreated,
  userRole,
}: CreateJobDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const formName = 'Job Position';

  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    undefined,
    undefined,
    true,
  );

  if (userRole !== 'hr' && userRole !== 'admin') {
    return null;
  }

  const initialValues: JobFormValues = {
    _id: '',
    title: '',
    status: 'draft',
    description: '',
    skills: [] as string[],
    salary: {
      min: 0,
      max: 0,
      inText: '',
      isPrivate: false,
    },
    experience: 0,
    links: [] as string[],
    files: [] as File[],
    images: [] as File[],
    removedFiles: [] as string[],
    removedImages: [] as string[],
    customFields: { ...inits },
    evaluationWeights: {
      skills: 25,
      experience: 25,
      affordability: 25,
      overall: 25,
    },
    promptForStatusChangeReason: true,
  };

  const handleSubmit = async (
    values: JobFormValues,
    { resetForm, setSubmitting }: FormikHelpers<JobFormValues>,
  ) => {
    const fileNames = values.files.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    const convertFileToBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

    if (hasDuplicates) {
      toast({
        title: 'Alert',
        description:
          'Duplicate file names found! Please rename before submitting.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const newJob = {
        ...values,
        status: values?.status || 'draft',
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
                  type: 'pdf' as const,
                  size: file.size,
                };
              }),
            )) || [],
          images:
            (await Promise.all(
              values.images.map(async (image) => {
                const base64 = await convertFileToBase64(image);
                return {
                  id: Math.random().toString(36).substr(2, 9),
                  name: image.name,
                  url: base64, // Store Base64 string
                  type: 'image' as const,
                  size: image.size,
                };
              }),
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
        title: 'Error',
        description: 'Failed to create job',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validationSchemas = jobSchema(validationSchema);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus className="mr-2 h-4 w-4" />
          Create Job
        </Button>
      </DialogTrigger>
      <DialogContent
        size="2xl"
        className="flex max-h-[90vh] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>Create New Job Position</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new job listing.
          </DialogDescription>
        </DialogHeader>
        <Formik
          initialValues={initialValues as JobFormValues}
          validationSchema={validationSchemas}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors }) => (
            <Form className="flex h-[calc(90vh-80px)] flex-col overflow-hidden">
              <div className="sticky top-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <JobForm />
                <CustomFields formName={formName} />
              </div>
              <div className="sticky bottom-0 z-10 mt-auto flex justify-end space-x-2 border-t bg-background px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  onClick={() => scrollToError(errors)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Create Job'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
