"use client";
import { Formik, Form, Field, FormikHelpers } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Candidate } from "@/types/candidate";
import { toast } from "@/hooks/use-toast";
import {
  useFetchOpenJobsQuery,
  useAssignJobMutation,
} from "@/lib/features/job/jobApi";

interface AssignCandidateDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJobAssignment?: () => void;
}

interface FormValues {
  jobId: string;
}

// Validation schema
const validationSchema = Yup.object({
  jobId: Yup.string().required("Job is required"),
});

export function AssignJobDialog({
  candidate,
  isOpen,
  onOpenChange,
  onJobAssignment,
}: AssignCandidateDialogProps) {
  const { data: jobs } = useFetchOpenJobsQuery();
  const [assignJob] = useAssignJobMutation();

  // Initial form values
  const initialValues: FormValues = {
    jobId: "",
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    try {
      if (
        (typeof candidate.jobId === "string" &&
          candidate.jobId !== values.jobId) ||
        (typeof candidate.jobId === "object" &&
          candidate.jobId._id !== values.jobId)
      ) {
        await assignJob({
          jobId: values.jobId,
          candidateId: candidate._id,
        }).unwrap();
        onJobAssignment?.();
        toast({
          title: "Success",
          description: "Candidate assigned successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Candidate is already assigned to this job",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign job to candidate.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden flex flex-col justify-start">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex justify-between align-center">
            Assign Job
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, setFieldValue }) => (
            <Form className="flex-1 flex flex-col h-full overflow-y-scroll ">
              <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="interviewerId">Assign To</Label>
                    <Field name="jobId">
                      {({ field }: { field: { value: string } }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            setFieldValue("jobId", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Job" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs?.map((job) => (
                              <SelectItem key={job._id} value={job._id}>
                                {job.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </Field>
                    {errors.jobId && touched.jobId && (
                      <div className="text-red-500 text-sm">{errors.jobId}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex relative bottom-0 justify-between w-full space-x-2 border-t bg-background px-6 py-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
