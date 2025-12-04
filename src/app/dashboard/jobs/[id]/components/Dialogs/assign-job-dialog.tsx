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
  useBulkAssignJobMutation,
} from "@/lib/features/job/jobApi";
import { Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AssignJobDialogProps {
  candidate: Candidate | Candidate[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJobAssignment?: (updatedCandidates: Candidate | Candidate[]) => void;
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
}: AssignJobDialogProps) {
  const { data: jobs, isFetching, error } = useFetchOpenJobsQuery();
  const [assignJob] = useAssignJobMutation();
  const [bulkAssignJob] = useBulkAssignJobMutation();
  const [loading, setLoading] = useState(false);

  // Determine if multiple candidates are being assigned
  const isMultiple = Array.isArray(candidate);
  const candidateCount = isMultiple ? candidate.length : 1;

  // Initial form values
  const initialValues: FormValues = {
    // jobId: "",
    jobId:
      !isMultiple && candidate.jobId
        ? typeof candidate.jobId === "string"
          ? candidate.jobId
          : typeof candidate.jobId === "object"
            ? candidate.jobId._id
            : ""
        : "",
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    setLoading(true);
    try {
      if (isMultiple) {
        // Use bulk endpoint for multiple candidates
        try {
          const candidateIdsToMove = candidate
            .filter((c) => {
              const isAlreadyAssigned =
                c.jobId &&
                (typeof c.jobId === "string"
                  ? c.jobId === values.jobId
                  : c.jobId._id === values.jobId);
              return !isAlreadyAssigned;
            })
            .map((c) => c._id);

          if (candidateIdsToMove.length === 0) {
            toast({
              title: "Warning",
              description: "All selected candidates are already assigned to this job",
              variant: "destructive",
            });
            return;
          }

          const resp = await bulkAssignJob({
            jobId: values.jobId,
            candidateIds: candidateIdsToMove,
          }).unwrap();

          onJobAssignment?.(resp.updatedCandidates);
          toast({
            title: "Success",
            description: `Successfully assigned ${candidateIdsToMove.length} candidate(s) to the job`,
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Bulk job assignment failed.",
            variant: "destructive",
          });
        }
      } else {
        // Handle single candidate
        const isAlreadyAssigned =
          candidate.jobId &&
          typeof candidate.jobId === "object" &&
          (typeof candidate.jobId === "string"
            ? candidate.jobId === values.jobId
            : candidate.jobId._id === values.jobId);

        if (!isAlreadyAssigned) {
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
      }
    } catch {
      toast({
        title: "Error",
        description: `Job assignment to ${isMultiple ? "candidates" : "candidate"} failed.`,
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
            {isMultiple
              ? `Assign Job to ${candidateCount} Candidates`
              : "Assign Job"}
          </DialogTitle>
        </DialogHeader>

        {/* loading skeleton */}
        {isFetching ? (
          <div className="flex flex-col gap-4 px-6 py-8">
            <div className="space-y-3">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading open jobs...</span>
            </div>
          </div>
        ) : error ? ( // error state
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-red-500 font-medium">Failed to fetch jobs</p>
            <p className="text-muted-foreground text-sm">
              Please try again or check your network connection.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ errors, touched, isSubmitting, setFieldValue }) => (
              <Form className="flex-1 flex flex-col h-full overflow-y-auto">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="jobId">Assign To</Label>
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
                              {jobs?.length ? (
                                jobs.map((job) => (
                                  <SelectItem
                                    className="w-full hover:bg-gray-100 cursor-pointer"
                                    key={job._id}
                                    value={job._id}
                                  >
                                    {job.title}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground px-4 py-2">
                                  No open jobs available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                      {errors.jobId && touched.jobId && (
                        <div className="text-red-500 text-sm">
                          {errors.jobId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex relative bottom-0 justify-between w-full space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
                  <Button
                    type="submit"
                    disabled={isSubmitting || loading}
                    variant="primary"
                  >
                    {isSubmitting || loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isSubmitting || loading ? "Assigning" : "Assign"}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </DialogContent>
    </Dialog>
  );
}
