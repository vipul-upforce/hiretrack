import { useField, useFormikContext } from "formik";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { MobileFileUpload } from "@/components/ui/file-upload-mobile";
import { useSelector } from "react-redux";
import { useSanitizeFiles } from "@/hooks/useSanitizeFiles";
import { toast } from "@/hooks/use-toast";

interface CandidateResumeSectionProps {
  setTempResumeUrl: (url: string) => void;
  onFileUpload?: (file: File) => Promise<string | void>;
}

export function CandidateResumeSection({
  setTempResumeUrl,
  onFileUpload,
}: CandidateResumeSectionProps) {
  const { setFieldValue, setTouched, submitCount } = useFormikContext();
  const [resumeField, resumeMeta] = useField("resume");
  const { user } = useSelector((state: any) => state.auth || {});
  const { sanitizeFiles } = useSanitizeFiles();

  const handleFileSelect = async (files: File[]) => {
    const sanitizedFiles = sanitizeFiles(files);
    if (!user && files[0].size > 3 * 1024 * 1024) {
      toast({
        title: `File "${files[0].name}" exceeds 3MB. Please upload a smaller file.`,
        variant: "destructive",
      });
      return false;
    }
    if (
      user &&
      (user.role === "candidate" || user.role === "") &&
      files[0].size > 3 * 1024 * 1024
    ) {
      toast({
        title: "File size exceeds 3MB. Please upload a smaller file.",
        variant: "destructive",
      });
      return;
    }
    if (
      user &&
      ["hr", "admin", "interviewer"].includes(user.role) &&
      files[0].size > 50 * 1024 * 1024
    ) {
      toast({
        title: "File size exceeds 3MB. Please upload a smaller file.",
        variant: "destructive",
      });
      return;
    }
    setFieldValue("resume", sanitizedFiles[0]);

    // Create a temporary blob URL for immediate client-side preview
    setTempResumeUrl(URL.createObjectURL(sanitizedFiles[0]));

    if (onFileUpload) {
      await onFileUpload(sanitizedFiles[0]);
    }
    setTimeout(() => {
      setTouched({
        name: false,
        location: false,
        experience: true,
        relevantExperience: true,
        skills: true,
        expectedCTC: true,
        currentCTC: true,
        noticePeriod: true,
        email: false,
      });
    }, 100);
  };

  const handleSetter = (files: File[]) => {
    const sanitizedFiles = sanitizeFiles(files);
    setFieldValue("resume", sanitizedFiles[0]);
  };

  return (
    <div className="space-y-3" data-form-field="resume">
      <Label className="font-semibold">
        Resume <span className="text-red-500">*</span>
      </Label>

      {/* Mobile Upload */}
      <div className="lg:hidden">
        <MobileFileUpload
          accept={{ "application/pdf": [".pdf"] }}
          onFileSelect={handleFileSelect}
          files={resumeField.value ? [resumeField.value] : []}
          setter={handleSetter}
          buttonText="Add Resume"
        />
      </div>

      {/* Desktop Upload */}
      <div className="hidden lg:block">
        <FileUpload
          id="resume"
          isResume={true}
          colorScheme="green"
          accept={{ "application/pdf": [".pdf"] }}
          maxFiles={1}
          onFileSelect={handleFileSelect}
          files={resumeField.value ? [resumeField.value] : []}
          setter={handleSetter}
        />
      </div>

      {(resumeMeta.touched || submitCount > 0) && resumeMeta.error && (
        <div className="text-sm text-destructive">{resumeMeta.error}</div>
      )}
    </div>
  );
}

