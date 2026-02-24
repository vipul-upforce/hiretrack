'use client';

import { useFormikContext } from 'formik';
import CustomFields from '@/Custom_Fields/Components/CustomFields';
import { useEffect, useState, useRef } from 'react';
import type { CandidateFormValues } from '../../schemas/candidate-schema';
import { ResumePreviewSection } from './candidate-form-components/resume-preview-section';
import { CandidateBasicInfoSection } from './candidate-form-components/CandidateBasicInfoSection';
import { CandidateExperienceSection } from './candidate-form-components/CandidateExperienceSection';
import { CandidateSkillsSection } from './candidate-form-components/CandidateSkillsSection';
import { CandidateProfessionalDetailsSection } from './candidate-form-components/CandidateProfessionalDetailsSection';
import { CandidateAssignmentSection } from './candidate-form-components/CandidateAssignmentSection';
import { CandidateAttachmentsSection } from './candidate-form-components/CandidateAttachmentsSection';
import { CandidateResumeSection } from './candidate-form-components/CandidateResumeSection';

interface CandidateFormProps {
  onFileUpload?: (file: File) => Promise<string | void>; // Prop to handle file upload to a persistent storage
  isEditMode?: boolean;
  jobId?: string;
}

export function CandidateForm({
  onFileUpload,
  isEditMode = false,
  jobId,
}: CandidateFormProps) {
  const { values } = useFormikContext<CandidateFormValues>();
  const [tempResumeUrl, setTempResumeUrl] = useState<string | null>(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null); // State to track only blob URLs for cleanup
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup previous blob URL if it exists
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      setCurrentBlobUrl(null); // Clear it after revoking
    }

    const resumeValue = values.resume as { url?: string } | File;
    if (resumeValue) {
      if (resumeValue instanceof File) {
        // For immediate client-side preview of newly selected files
        const newBlobUrl = URL.createObjectURL(resumeValue);
        setTempResumeUrl(newBlobUrl);
        setCurrentBlobUrl(newBlobUrl); // Store the blob URL for cleanup
      } else if ('url' in resumeValue && resumeValue.url) {
        // For persistent preview from a public URL (e.g., after upload)
        setTempResumeUrl(resumeValue.url);
      }
    } else {
      setTempResumeUrl(null);
    }

    // Cleanup on unmount
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [values.resume]); // Only depend on values.resume

  return (
    <div className="w-full h-full flex flex-col" ref={formRef}>
      {/* Responsive conditional rendering to ensure proper DOM presence for error scrolling and focus */}
      {typeof window !== 'undefined' && window.innerWidth < 1024 ? (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            <CandidateResumeSection
              setTempResumeUrl={setTempResumeUrl}
              onFileUpload={onFileUpload}
            />
            <CandidateBasicInfoSection />
            <CandidateExperienceSection />
            <CandidateSkillsSection />
            <CandidateProfessionalDetailsSection />
            <CustomFields
              formName="Candidate"
              isEditMode={isEditMode}
              jobId={jobId}
            />
            <CandidateAssignmentSection />
            <CandidateAttachmentsSection />
            <div className="h-24" />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-6 flex-1 h-full overflow-hidden">
          {/* Form Section - Desktop */}
          <div className="w-1/2 space-y-4 overflow-y-auto px-3 py-3">
            <CandidateResumeSection
              setTempResumeUrl={setTempResumeUrl}
              onFileUpload={onFileUpload}
            />
            <CandidateBasicInfoSection />
            <CandidateExperienceSection />
            <CandidateSkillsSection />
            <CandidateProfessionalDetailsSection />
            <CustomFields
              formName="Candidate"
              isEditMode={isEditMode}
              jobId={jobId}
            />
            <CandidateAssignmentSection />
            <CandidateAttachmentsSection />
          </div>

          <ResumePreviewSection tempResumeUrl={tempResumeUrl} />
        </div>
      )}
    </div>
  );
}
