'use client';

import { useState } from 'react';
import { useField, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/ui/file-upload';
import { MobileFileUpload } from '@/components/ui/file-upload-mobile';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAppSelector } from '@/lib/redux/hooks';

export function CandidateAttachmentsSection() {
  const { setFieldValue } = useFormikContext();
  const [attachmentsField] = useField('attachments');
  const { user } = useAppSelector((state) => state.auth || {});
  const { sanitizeFiles } = useSanitizeFiles();

  // Local state for handling validation errors inline
  const [errorMsg, setErrorMsg] = useState<string>('');

  // This will be true either the logged in user is candidate or the user is guest.
  // For the admin, Hr, and Interviewer this condition will be false.
  const isCandidateOrGuest =
    !user || user.role === 'candidate' || user.role === '';
  const maxAllowedFiles = isCandidateOrGuest ? 2 : 30;
  const maxFileSize = isCandidateOrGuest ? 3 * 1024 * 1024 : 50 * 1024 * 1024;
  const maxFileSizeLabel = isCandidateOrGuest ? '3MB' : '50MB';

  const handleFileSelect = (files: File[]) => {
    setErrorMsg('');

    const sanitizedFiles = sanitizeFiles(files);
    const currentFiles = attachmentsField.value || [];

    const totalFilesAfterUpload = currentFiles.length + sanitizedFiles.length;

    if (totalFilesAfterUpload > maxAllowedFiles) {
      const msg = `Maximum ${maxAllowedFiles} files are allowed.`;
      setErrorMsg(msg);
      toast({
        title: 'Limit Exceeded',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    let hasSizeError = false;

    const newFiles = sanitizedFiles
      .filter((file) => {
        if (file.size > maxFileSize) {
          const msg = `File "${file.name}" exceeds ${maxFileSizeLabel}.`;
          setErrorMsg(msg);
          hasSizeError = true;
          return false;
        }
        return true;
      })
      .map((file) => {
        let newFileName = file.name;

        const fileExists = currentFiles.some(
          (att: File) => att.name === file.name,
        );

        if (fileExists) {
          const fileExtension = file.name.split('.').pop();
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
        }

        return new File([file], newFileName, { type: file.type });
      });

    if (!hasSizeError && newFiles.length > 0) {
      const updatedFileSelection = [...currentFiles, ...newFiles];
      setFieldValue('attachments', updatedFileSelection);
    }
  };

  const handleSetter = (files: File[]) => {
    setErrorMsg('');
    const sanitizedFiles = sanitizeFiles(files);
    setFieldValue('attachments', sanitizedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="hidden border-b border-gray-200 pb-2 dark:border-gray-700 lg:block">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <div className="h-2 w-2 rounded-full bg-cyan-500" />
          Additional Documents
        </h3>
      </div>

      {/* Mobile Label */}
      <Label className="font-semibold lg:hidden">Additional Attachments</Label>

      {/* Mobile Upload */}
      <div className="lg:hidden">
        <MobileFileUpload
          accept={{}}
          maxFiles={maxAllowedFiles}
          onFileSelect={handleFileSelect}
          files={attachmentsField.value || []}
          setter={handleSetter}
          buttonText="Add Attachments"
          maxFileSizeLabel={maxFileSizeLabel}
          errorMessage={errorMsg}
        />
      </div>

      {/* Desktop Upload */}
      <div className="hidden lg:block">
        <FileUpload
          accept={{}}
          maxFiles={maxAllowedFiles}
          isEdit
          onFileSelect={handleFileSelect}
          files={attachmentsField.value || []}
          setter={handleSetter}
          maxFileSizeLabel={maxFileSizeLabel}
          errorMessage={errorMsg}
        />
      </div>
    </div>
  );
}
