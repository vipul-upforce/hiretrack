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
import { Loader2 } from "lucide-react";
import { useState } from "react";


interface AssignCandidateDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJobAssignment?: (x?: any) => void;
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
  const [loading, setLoading] = useState(false);

  // Initial form values
  const initialValues: FormValues = {
    jobId: "",
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    setLoading(true);
    try {
      if (
        candidate.jobId === undefined ||
        (typeof candidate.jobId === "string" &&
          candidate.jobId !== values.jobId) ||
        (typeof candidate.jobId === "object" &&
          candidate.jobId._id !== values.jobId)
      ) {
        const resp = await assignJob({
          jobId: values.jobId,
          candidateId: candidate._id,
        }).unwrap();
        onJobAssignment?.(resp.updatedCandidate);
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
        description: "Job assignment to the candidate failed.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden flex flex-col justify-start">
        <DialogHeader className="px-6 py-4 pr-12">
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
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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
                          <SelectTrigger className="w-[400px]">
                            <SelectValue placeholder="Select Job" />
                          </SelectTrigger>
                          <SelectContent className="w-[500px]">
                            {jobs?.map((job) => (
                              <SelectItem
                                className="w-full hover:bg-gray-100 cursor-pointer"
                                key={job._id}
                                value={job._id}
                              >
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

              <div className="flex relative bottom-0 justify-between w-full space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
                <Button type="submit" disabled={isSubmitting || loading} variant="primary" >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting && loading ? "Assigning" : "Assign"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
