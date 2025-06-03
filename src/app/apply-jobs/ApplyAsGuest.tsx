"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Formik, Form } from "formik";
import { useState, useEffect } from "react";
import { CandidateForm } from "../dashboard/jobs/[id]/components/Candidate/candidate-form";
import {
  useApplicationEventMailMutation,
  useCreateGuestCandidateMutation,
  useEvaluateCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { v4 as uuidv4 } from "uuid";
import useCustomForm, {
  CustomFieldValues,
} from "@/Custom_Fields/hooks/useCustomForm";
import { Resume } from "@/lib/redux/types";
import { parseResumeFromPdf } from "@/lib/parse-resume-from-pdf";
import FormUpdater from "../dashboard/jobs/[id]/components/Utils/FormUpdater";
import * as pdfjs from "pdfjs-dist";
import { candidateSchema } from "../dashboard/jobs/[id]/schemas/candidate-schema";
import { useApplyHandler } from "./useApplyHandler";

// New function to store application status in localStorage
const storeGuestApplication = (jobId: string, candidateId: string) => {
  try {
    // Get existing applications or initialize empty object
    const existingApplications = JSON.parse(
      localStorage.getItem("guestApplications") || "{}"
    );

    // Add this application
    existingApplications[jobId] = {
      candidateId,
      appliedAt: new Date().toISOString(),
    };

    // Save back to localStorage
    localStorage.setItem(
      "guestApplications",
      JSON.stringify(existingApplications)
    );

    return true;
  } catch (error) {
    console.error("Failed to store guest application status:", error);
    return false;
  }
};

// Function to check if user has already applied to this job
export const hasAppliedAsGuest = (jobId: string): boolean => {
  try {
    const applications = JSON.parse(
      localStorage.getItem("guestApplications") || "{}"
    );
    return !!applications[jobId];
  } catch {
    return false;
  }
};

// New function to call the evaluate API
export async function evaluateCandidate(
  candidateId: string,
  evaluateCandidateMutation: ReturnType<typeof useEvaluateCandidateMutation>[0]
) {
  try {
    const result = await evaluateCandidateMutation({ candidateId }).unwrap();
    return result;
  } catch {
    return null;
  }
}

//event mail handler function
async function sendAppliedEventMail(
  candidateId: string,
  applicationEventMailMutation: ReturnType<
    typeof useApplicationEventMailMutation
  >[0]
) {
  try {
    const resp = await applicationEventMailMutation({ candidateId }).unwrap();
    return resp;
  } catch {
    return null;
  }
}

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
  closeParent: () => void;
}

const getInitialValues = (customFields: CustomFieldValues) => ({
  name: "",
  location: "",
  experience: 0,
  skills: [],
  expectedCTC: 0,
  currentCTC: 0,
  noticePeriod: 0,
  resume: null as File | null,
  remarks: "",
  attachments: [] as File[],
  assignee: "",
  time: undefined,
  customFields: { ...customFields },
  email: "",
});

const handleFileParse = async (
  file: File | null,
  setParsedResume: (data: Resume | null) => void
) => {
  if (file && file.type === "application/pdf") {
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result;
      if (result && typeof result === "string") {
        try {
          const fileUrl = result;
          const parsedData = await parseResumeFromPdf(fileUrl);
          setParsedResume(parsedData);
        } catch {
          setParsedResume(null);
        }
      }
    };
    reader.onerror = () => {};
    reader.readAsDataURL(file);
  }
};

type CandidateFormValues = ReturnType<typeof getInitialValues>;

// Add this function before handleSubmit
const checkPdfPageCount = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      try {
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        resolve(pdf.numPages);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export function ApplyAsGuestDialog({
  jobId,
  isOpen,
  setIsOpen,
  resumeFile,
  closeParent,
}: CreateCandidateDialogProps) {
  const { toast } = useToast();
  const [createGuestCandidate] = useCreateGuestCandidateMutation();
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [applicationEventMailMutation, { isLoading: isSendingEmail }] =
    useApplicationEventMailMutation();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = "Candidate";
  const { validationSchema, initialValues: inits } = useCustomForm(formName);
  const [resetForm, setResetForm] = useState(false);
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);
  const { formikRef, handleApply } = useApplyHandler<CandidateFormValues>();

  useEffect(() => {
    if (isOpen) {
      // Check if user has already applied when dialog opens
      setHasAlreadyApplied(hasAppliedAsGuest(jobId));

      if (resumeFile) {
        setParsedResume(null);
        handleFileParse(resumeFile, setParsedResume);
      }
    } else {
      setParsedResume(null);
      setResetForm((prev) => !prev);
    }
  }, [isOpen, resumeFile, jobId]);

  const handleSubmit = async (values: CandidateFormValues) => {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    // First check if already applied
    if (hasAppliedAsGuest(jobId)) {
      toast({
        title: "Already Applied",
        description: "You have already applied for this job as a guest.",
        variant: "destructive",
      });
      setIsOpen(false);
      return;
    }

    const fileNames = values.attachments.map((file) => file.name);
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
      const hasOnlySpaces = Object.entries(values).some((value) => {
        if (typeof value[1] === "string") {
          return value[1].length > 0 && value[1].trim() === "";
        }
        return false;
      });

      if (hasOnlySpaces) {
        toast({
          title: "Validation Error",
          description: "Fields cannot contain only spaces",
          variant: "destructive",
        });
        return;
      }

      const resumeBase64 = values.resume
        ? await convertFileToBase64(values.resume)
        : null;

      const attachmentsBase64 = await Promise.all(
        values.attachments.map((file) => convertFileToBase64(file))
      );

      const candidateData = {
        ...values,
        jobId: {
          _id: jobId,
          title: "",
          description: "",
        },
        currentCTC: Number(parseFloat(String(values.currentCTC)).toFixed(2)),
        expectedCTC: Number(parseFloat(String(values.expectedCTC)).toFixed(2)),
        experience: Number(parseFloat(String(values.experience)).toFixed(2)),
        noticePeriod: Number(
          parseFloat(String(values.noticePeriod)).toFixed(0)
        ),
        email: values.email || parsedResumeData?.profile?.email,
        ...(values.assignee && values.time
          ? {
              assignee: values.assignee === "-1" ? "" : values.assignee,
              time: values.time,
            }
          : {}),
        resume: resumeBase64
          ? {
              id: uuidv4(),
              name: values.resume?.name || "",
              url: resumeBase64, // Using base64 as URL for now; adjust if backend changes
              type: "pdf",
              size: values.resume?.size || 0,
            }
          : undefined,
        attachments: attachmentsBase64.map((base64, index) => ({
          id: uuidv4(),
          name: values.attachments[index].name,
          url: base64,
          type: values.attachments[index].type,
          size: values.attachments[index].size,
        })),
        remarks: [],
      };

      // Step 1: Create the candidate
      const createdCandidate =
        await createGuestCandidate(candidateData).unwrap();
      const candidateId = createdCandidate._id;

      // Store application status in localStorage
      storeGuestApplication(jobId, candidateId);

      if (values.resume && values.resume.type === "application/pdf") {
        const pageCount = await checkPdfPageCount(values.resume);
        if (pageCount <= 4) {
          evaluateCandidate(candidateId, evaluateCandidateMutation);
        }
      }

      // Send application confirmation email
      sendAppliedEventMail(candidateId, applicationEventMailMutation);

      // Show success message for guest application
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully!",
      });

      setIsOpen(false);
      closeParent();
    } catch (error) {
      if (typeof error === "object" && error !== null && "data" in error) {
        const errorData = (error as { data?: { error?: string } }).data;
        if (
          typeof errorData === "object" &&
          errorData !== null &&
          "error" in errorData
        ) {
          toast({
            title: "Error",
            description: errorData.error || "Failed to create candidate",
            variant: "destructive",
          });
          return;
        }
      }
      toast({
        title: "Error",
        description: "Failed to create candidate due to an unexpected error.",
        variant: "destructive",
      });
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
  // const handleApply = async () => {
  //   if (!formikRef.current) return;

  //   const errors = await formikRef.current.validateForm();
  //   formikRef.current.setTouched({
  //     name: true,
  //     email: true,
  //     location: true,
  //     experience: true,
  //     skills: [],
  //     expectedCTC: true,
  //     currentCTC: true,
  //     noticePeriod: true,
  //     resume: true,
  //   });

  //   const firstErrorKey = Object.keys(errors)[0];
  //   if (firstErrorKey) {
  //     const el = document.querySelector(`[id="${firstErrorKey}"]`);
  //     el?.scrollIntoView({ behavior: "smooth", block: "center" });
  //     (el as HTMLElement)?.focus();
  //     return;
  //   }

  //   formikRef.current.handleSubmit();
  // };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={isSendingEmail || hasAlreadyApplied}
          className={`inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${hasAlreadyApplied && "bg-gray-200 text-gray-600"}`}
        >
          {isSendingEmail
            ? "Processing..."
            : hasAlreadyApplied
              ? "Applied"
              : "Apply As Guest"}
        </button>
      </DialogTrigger>
      <DialogContent
        className={`sm:max-w-[80vw] xl:max-w-[65vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-center`}
      >
        <DialogHeader className={`px-6 py-2 ${hasAlreadyApplied && "hidden"}`}>
          <DialogTitle>Apply</DialogTitle>
        </DialogHeader>
        {hasAlreadyApplied ? (
          <div className="p-6 pt-0 text-center flex flex-col justify-start items-center ">
            <div className="w-[400px] h-[400px]  mb-2"></div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Application Already Submitted
              </h3>
              <p className="text-muted-foreground mb-4">
                We've received your application for this job. No further action
                is needed at this time.
              </p>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <Formik
            innerRef={formikRef}
            key={resetForm.toString()}
            initialValues={{
              ...getInitialValues(inits as CustomFieldValues),
              resume: resumeFile || null,
            }}
            validationSchema={candidateSchema(validationSchema)}
            onSubmit={handleSubmit}
            enableReinitialize={false}
          >
            {({ isSubmitting, errors, touched, setFieldValue }) => (
              <Form className="flex flex-col h-[calc(90vh-80px)] overflow-hidden">
                <FormUpdater parsedResumeData={parsedResumeData} />
                <CandidateForm
                  onFileUpload={async (file: File) => {
                    setFieldValue("resume", file);
                    await handleFileParse(file, setParsedResume);
                  }}
                />
                <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleApply}
                    // disabled={
                    //   isSubmitting ||
                    //   Object.keys(errors).length > 0 ||
                    //   Object.keys(touched).length === 0
                    // }
                  >
                    {isSubmitting ? "Saving..." : "Apply"}
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
