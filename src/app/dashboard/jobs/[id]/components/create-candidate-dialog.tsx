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
import { candidateSchema } from "../schemas/candidate-schema";
import { useState, useEffect } from "react";
import { CandidateForm } from "./candidate-form";
import {
  useCreateCandidateMutation,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { v4 as uuidv4 } from "uuid";
import useCustomForm, {
  CustomFieldValues,
} from "@/Custom_Fields/hooks/useCustomForm";
// import CustomFields from "@/Custom_Fields/Components/CustomFields";
import { ICandidateHistory } from "@/lib/models/history";
import { Resume } from "@/lib/redux/types";
import { parseResumeFromPdf } from "@/lib/parse-resume-from-pdf";
import FormUpdater from "./FormUpdater";
import Cookies from "js-cookie";

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
}

const getInitialValues = (customFields: CustomFieldValues) => ({
  name: "",
  location: "",
  experience: 0,
  skills: [],
  expectedCTC: 0,
  currentCTC: 0,
  noticePeriod: 0,
  // currentLocation: "",
  resume: null as File | null,
  remarks: "",
  attachments: [] as File[],
  assignee: "",
  deadline: undefined,
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
          // Use the full data URL, not just the Base64 content
          const fileUrl = result; // Data URL format (e.g., data:application/pdf;base64,...)

          const parsedData = await parseResumeFromPdf(fileUrl);
          setParsedResume(parsedData);
        } catch {
          setParsedResume(null);
        }
      }
    };

    reader.onerror = () => {};

    reader.readAsDataURL(file); // Converts to data URL directly
  }
};

// This component will update form values when parsedResumeData changes

// Define return type of getInitialValues
type CandidateFormValues = ReturnType<typeof getInitialValues>;

export function CreateCandidateDialog({
  jobId,
  isOpen,
  setIsOpen,
  resumeFile,
}: CreateCandidateDialogProps) {
  // const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [createCandidate] = useCreateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [updateAppliedApplication] = useUpdateAppliedApplicationMutation();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = "Candidate";
  const { validationSchema, initialValues: inits } = useCustomForm(formName);
  const [resetForm, setResetForm] = useState(false);
  // const [currentUser, setCurrentUser] = useState<IUser|null>(null);

  const userCookie = Cookies.get("user") || "{}";
  const user = JSON.parse(userCookie);

  useEffect(() => {
    if (isOpen) {
      // Set the resume file when the dialog opens
      if (resumeFile) {
        setParsedResume(null); // Reset parsed data
        handleFileParse(resumeFile, setParsedResume);
      }
    } else {
      // Reset everything when the dialog closes
      setParsedResume(null);
      setResetForm((prev) => !prev);
      resumeFile = null; // Clear the resume file
    }
  }, [isOpen, resumeFile]);

  const handleSubmit = async (values: CandidateFormValues) => {
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
      // Check for fields that contain only spaces
      const hasOnlySpaces = Object.entries(values).some((value) => {
        // Check string fields only
        if (typeof value[1] === "string") {
          // If the field is not empty but contains only spaces
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

      // Convert files to base64
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
        // Include email from parsed resume data
        email: parsedResumeData?.profile?.email || values.email,
        // Only include assignment if both assignee and deadline are provided
        ...(values.assignee && values.deadline
          ? {
              assignee: values.assignee === "-1" ? "" : values.assignee,
              deadline: values.deadline,
            }
          : {}),
        resume: resumeBase64
          ? {
              id: uuidv4(),
              name: values.resume?.name || "",
              url: resumeBase64,
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

      const createdCandidate = await createCandidate(candidateData).unwrap();
      if (user?.role === "candidate") {
        try {
          await updateAppliedApplication({ id: jobId });
        } catch (error: unknown) {
          toast({
            title: "Failed",
            description: `${error instanceof Error ? error.message : "Unknown Error Occured"}`,
          });
        }
      }

      if (createdCandidate?.assignment?.interviewerId) {
        const newHistoryEntry: ICandidateHistory = {
          dateTime: createdCandidate?.assignment?.deadline || "",
          title:
            typeof createdCandidate?.assignment?.interviewerId === "object" &&
            createdCandidate?.assignment?.interviewerId?.name
              ? `Assigned to ${createdCandidate.assignment.interviewerId.name} : Assigned by ${user.name}`
              : "",
          currentInterviewer:
            typeof createdCandidate?.assignment?.interviewerId === "object" &&
            createdCandidate?.assignment?.interviewerId
              ? Object(createdCandidate.assignment.interviewerId._id)
              : null,
          previousInterviewer: null,
          assignmentBy: user.id,

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
          jobId: candidateData.jobId._id,
          newEntry: newHistoryEntry,
        }).unwrap();
      }

      setIsOpen(false);
      toast({
        title: "Success",
        description: "Candidate added successfully",
      });
    } catch (error) {
      // console.log(error);

      if (typeof error === "object" && error !== null && "data" in error) {
        const errorData = (error as { data?: { error?: string } }).data;

        if (
          typeof errorData === "object" &&
          errorData !== null &&
          "error" in errorData
        ) {
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
        {user.role === "candidate" ? (
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Apply Now
          </button>
        ) : (
          <Button>
            <Plus className="h- w-4 mr-2" />
            Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={`sm:max-w-[80vw] xl:max-w-[65vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-center`}
      >
        <DialogHeader className="px-6 py-2">
          <DialogTitle>
            {user.role === "candidate"
              ? "Add Application"
              : "Add New Candidate"}
          </DialogTitle>
        </DialogHeader>
        <Formik
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
              {/* This component will update form values when parsedResumeData changes */}
              <FormUpdater parsedResumeData={parsedResumeData} />

              <CandidateForm
                onFileUpload={async (file: File) => {
                  // console.log("Resume file uploaded: ", file);
                  setFieldValue("resume", file);
                  await handleFileParse(file, setParsedResume);
                }}
              />
              {/* <CustomFields formName={formName} /> */}
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
                  disabled={
                    isSubmitting ||
                    Object.keys(errors).length > 0 ||
                    Object.keys(touched).length === 0
                  }
                >
                  {isSubmitting
                    ? "Saving..."
                    : user.role === "candidate"
                      ? "Apply"
                      : "Add Candidate"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
