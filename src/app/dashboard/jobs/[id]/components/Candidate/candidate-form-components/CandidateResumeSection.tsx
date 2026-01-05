'use client';

import { useState } from 'react';
import { useField, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/ui/file-upload';
import { MobileFileUpload } from '@/components/ui/file-upload-mobile';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { toast } from '@/hooks/use-toast';
import { useAppSelector } from '@/lib/redux/hooks';

interface CandidateResumeSectionProps {
  setTempResumeUrl: (url: string | null) => void;
  onFileUpload?: (file: File) => Promise<string | void>;
}

export function CandidateResumeSection({
  setTempResumeUrl,
  onFileUpload,
}: CandidateResumeSectionProps) {
  const { setFieldValue, setTouched, submitCount } = useFormikContext();
  const [resumeField, resumeMeta] = useField('resume');
  const { user } = useAppSelector((state) => state.auth || {});
  const { sanitizeFiles } = useSanitizeFiles();

  // Local state for inline error messages
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isCandidateOrGuest =
    !user || user.role === 'candidate' || user.role === '';
  const maxFileSize = isCandidateOrGuest ? 3 * 1024 * 1024 : 50 * 1024 * 1024;
  const maxFileSizeLabel = isCandidateOrGuest ? '3MB' : '50MB';

  /**
   * Handles candidate file selection, including file size/rule enforcement and preview.
   */
  const handleFileSelect = async (files: File[]): Promise<false | void> => {
    setErrorMsg('');

    const sanitizedFiles = sanitizeFiles(files);

    // Return early if no file is present after sanitization
    if (!sanitizedFiles || sanitizedFiles.length === 0) return false;

    const selectedFile = sanitizedFiles[0];

    // Validate File Size
    if (selectedFile?.size > maxFileSize) {
      const msg = `File "${selectedFile.name}" exceeds ${maxFileSizeLabel}. Please upload a smaller file.`;
      setErrorMsg(msg);
      toast({
        title: 'File size limit exceeded',
        description: msg,
        variant: 'destructive',
      });
      return false;
    }

    setFieldValue('resume', selectedFile);

    // Create a temporary blob URL for immediate client-side preview
    setTempResumeUrl(URL.createObjectURL(selectedFile));

    // Await upload if consumer passed in a handler
    if (onFileUpload) {
      await onFileUpload(selectedFile);
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

    return undefined;
  };

  /**
   * Setter for resume field.
   * Handles both Sanitization (on add) and Removal (on empty array).
   */
  const handleSetter = (files: File[]) => {
    setErrorMsg(''); // Clear error on change

    if (files.length === 0) {
      setFieldValue('resume', null); // Clear Formik value
      setTempResumeUrl(null); // Clear Preview
      return;
    }

    // Handle Addition: Sanitize and set
    const sanitizedFiles = sanitizeFiles(files);
    if (sanitizedFiles && sanitizedFiles.length > 0) {
      setFieldValue('resume', sanitizedFiles[0]);
    }
  };

  return (
    <div className="space-y-3" data-form-field="resume">
      <Label className="font-semibold">
        Resume <span className="text-red-500">*</span>
      </Label>

      {/* Mobile Upload */}
      <div className="lg:hidden">
        <MobileFileUpload
          accept={{ 'application/pdf': ['.pdf'] }}
          onFileSelect={handleFileSelect}
          files={resumeField.value ? [resumeField.value] : []}
          setter={handleSetter}
          buttonText="Add Resume"
          maxFileSizeLabel={maxFileSizeLabel}
          errorMessage={errorMsg}
        />
      </div>

      {/* Desktop Upload */}
      <div className="hidden lg:block">
        <FileUpload
          id="resume"
          isResume
          colorScheme="green"
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          onFileSelect={handleFileSelect}
          files={resumeField.value ? [resumeField.value] : []}
          setter={handleSetter}
          maxFileSizeLabel={maxFileSizeLabel}
          errorMessage={errorMsg}
        />
      </div>

      {(resumeMeta.touched || submitCount > 0) && resumeMeta.error && (
        <div className="text-sm text-destructive">{resumeMeta.error}</div>
      )}
    </div>
  );
}
