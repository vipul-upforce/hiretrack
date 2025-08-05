"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Formik, Form } from "formik";
import { candidateSchema } from "../../schemas/candidate-schema";
import { useState, useEffect } from "react";
import { CandidateForm } from "../Candidate/candidate-form";
import {
  useApplicationEventMailMutation,
  useCreateCandidateMutation,
  useEvaluateCandidateMutation,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { v4 as uuidv4 } from "uuid";
import useCustomForm, {
  CustomFieldValues,
} from "@/Custom_Fields/hooks/useCustomForm";
import { ICandidateHistory } from "@/lib/models/history";
import { Resume } from "@/lib/redux/types";
import FormUpdater from "../Utils/FormUpdater";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { useApplyHandler } from "@/app/apply-jobs/useApplyHandler";
import { TermsConfirmationDialog } from "@/components/TermsConfirmationDialog";
import { useSelector } from "react-redux";
// New function to call the evaluate API
async function evaluateCandidate(
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
  isCreating?: (isCreating: boolean) => void;
  jobTitle?: string;
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
          // Dynamically import PDF parsing only on client side
          const { parseResumeFromPdf } = await import(
            "@/lib/parse-resume-from-pdf"
          );
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
  // console.log("%%%%%%% ", file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      try {
        // Dynamically import pdfjs only on client side
        const pdfjs = await import("pdfjs-dist");

        // Configure worker if not already set
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        }

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

export function CreateCandidateDialog({
  jobId,
  isOpen,
  setIsOpen,
  resumeFile,
  jobTitle,
  // isCreating,
}: CreateCandidateDialogProps) {
  const { toast } = useToast();
  const { formikRef, handleApply } = useApplyHandler<any>();
  const [createCandidate, { isLoading: isAdding }] =
    useCreateCandidateMutation();
  const [evaluateCandidateMutation, { isLoading: isEvaluating }] =
    useEvaluateCandidateMutation();
  const [applicationEventMailMutation, { isLoading: isSendingEmail }] =
    useApplicationEventMailMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [updateAppliedApplication, { isLoading }] =
    useUpdateAppliedApplicationMutation();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = "Candidate";
  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    undefined,
    undefined,
    true
  );
  const [resetForm, setResetForm] = useState(false);
  // const [user, setuser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] =
    useState<CandidateFormValues | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setuser(decryptedResponse.user);
  //       }
  //     }
  //   })();
  // }, []);

  useEffect(() => {
    if (isOpen && isClient) {
      if (resumeFile) {
        setParsedResume(null);
        handleFileParse(resumeFile, setParsedResume);
      }
    } else {
      setParsedResume(null);
      setResetForm((prev) => !prev);
    }
  }, [isOpen, resumeFile, isClient]);

  const handleTermsConfirm = () => {
    if (pendingFormValues) {
      setShowTermsDialog(false);
      // debugger;
      actualSubmit(pendingFormValues);
      setPendingFormValues(null);
    }
  };

  const handleSubmit = async (values: CandidateFormValues) => {
    // Only show terms confirmation dialog for candidates applying through portal
    // Admin/HR users adding candidates internally should skip the terms dialog
    if (user?.role === "candidate") {
      setPendingFormValues(values);
      setShowTermsDialog(true);
    } else {
      // Admin/HR users bypass terms dialog and submit directly
      actualSubmit(values);
    }
  };

  const actualSubmit = async (values: CandidateFormValues) => {
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

      // Debug: Log the candidate data being sent
      console.log("Candidate data being sent:", candidateData);
      console.log("JobId value:", jobId);

      // Step 1: Create the candidate
      setIsCreating(true);

      const createdCandidate = await createCandidate(candidateData).unwrap();
      const candidateId = createdCandidate._id;
      if (values.resume && values.resume.type === "application/pdf") {
        try {
          const pageCount = await checkPdfPageCount(values.resume);
          if (pageCount && pageCount <= 4) {
            // setTimeout(() => {
            evaluateCandidate(candidateId, evaluateCandidateMutation);
            // }, 2000);
          }
        } catch (pdfError) {
          console.warn(
            "PDF page count check failed, skipping AI evaluation:",
            pdfError
          );
          // Continue with submission even if PDF check fails
        }
      }

      // Step 3: Handle additional updates (if applicable)
      if (user?.role === "candidate") {
        // sendAppliedEventMail(candidateId, applicationEventMailMutation);
        try {
          await updateAppliedApplication({ id: jobId });
        } catch (error: unknown) {
          toast({
            title: "Failed",
            description: `${error instanceof Error ? error.message : "Unknown Error Occurred"}`,
          });
        }
      }

      if (createdCandidate?.assignment?.interviewerId) {
        const newHistoryEntry: ICandidateHistory = {
          dateTime: new Date().toISOString() || "",
          title:
            typeof createdCandidate?.assignment?.interviewerId === "object" &&
            createdCandidate?.assignment?.interviewerId?.name
              ? `Assigned to ${createdCandidate.assignment.interviewerId.name} : Assigned by ${user!.name}`
              : "",
          currentInterviewer:
            typeof createdCandidate?.assignment?.interviewerId === "object" &&
            createdCandidate?.assignment?.interviewerId
              ? Object(createdCandidate.assignment.interviewerId._id)
              : null,
          previousInterviewer: null,
          assignmentBy: user && user.id,
          note: {
            description: "",
            date: "",
            rating: 0,
            userId: null,
          },
          attachments:
            createdCandidate.attachments?.map((attachment) => ({
              id: attachment.id,
              name: attachment.name,
              url: attachment.url,
              type: attachment.type,
              size: attachment.size,
            })) || [],
        };
        await updateCandidateHistory({
          candidateId: createdCandidate._id,
          jobId: candidateData.jobId,
          newEntry: newHistoryEntry,
        }).unwrap();
      }

      setIsOpen(false);
      if (user?.role === "candidate") {
        sendAppliedEventMail(candidateId, applicationEventMailMutation);
      }
      // toast({
      //   title: "Success",
      //   description: "Candidate added successfully",
      // });
    } catch (error) {
      console.error("Create candidate error:", error);

      let errorMessage =
        "Failed to create candidate due to an unexpected error.";

      // Handle RTK Query error format
      if (typeof error === "object" && error !== null) {
        if ("data" in error) {
          const errorData = (error as { data?: any }).data;
          if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          }
        } else if (
          "message" in error &&
          typeof (error as any).message === "string"
        ) {
          errorMessage = (error as any).message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setIsCreating(false);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {user && user.role === "candidate" ? (
          <button
            type="button"
            disabled={
              isSendingEmail ||
              isCreating ||
              isLoading ||
              isAdding ||
              isEvaluating
            }
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {isSendingEmail ||
            isCreating ||
            isLoading ||
            isEvaluating ||
            isAdding
              ? "Processing..."
              : "Apply Now"}
          </button>
        ) : (
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={`sm:max-w-[80vw] xl:max-w-[65vw] h-[100vh] sm:h-[90vh] p-0 overflow-hidden flex flex-col`}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b text-left">
          <DialogTitle className="text-left text-xl font-bold text-gray-900 dark:text-white">
            {user && user.role === "candidate"
              ? "Add Application"
              : "Add New Candidate"}
          </DialogTitle>
          {jobTitle && (
            <p className="text-left text-sm text-gray-600 dark:text-gray-400 mt-1">
              Applying for: {jobTitle}
            </p>
          )}
        </DialogHeader>
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
          {({
            isSubmitting,
            errors,
            touched,
            setTouched,
            values,
            setFieldValue,
          }) => (
            <Form className="flex flex-col flex-1 min-h-0 sticky top-0 overflow-y-clip">
              <FormUpdater parsedResumeData={parsedResumeData} />
              <div className="flex-1 overflow-y-auto px-6 py-4 h-full">
                <CandidateForm
                  onFileUpload={async (file: File) => {
                    setFieldValue("resume", file);
                    await handleFileParse(file, setParsedResume);
                    Object?.entries(values?.customFields).forEach(
                      ([key, value]) => {
                        setTouched({ [key]: true });
                      }
                    );
                  }}
                />
              </div>
              <div className="flex-shrink-0 flex justify-end bottom-0 space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // scrollToErrorMassage(errors);
                    handleApply();
                  }}
                  type="button"
                  disabled={isSubmitting || isCreating || isLoading}
                >
                  {isSubmitting
                    ? "Saving..."
                    : user && user.role === "candidate"
                      ? "Apply"
                      : "Add Candidate"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>

      <TermsConfirmationDialog
        isOpen={showTermsDialog}
        onClose={() => {
          setShowTermsDialog(false);
          setPendingFormValues(null);
        }}
        onConfirm={handleTermsConfirm}
        isLoading={isCreating || isAdding || isEvaluating || isSendingEmail}
      />
    </Dialog>
  );
}
