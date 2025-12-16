'use client';

import { useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/ui/file-upload';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { JobFormValues } from '../../../schemas/job-schema';

export function AttachmentsSection() {
  const { values, setFieldValue } = useFormikContext<JobFormValues>();
  const { sanitizeFiles } = useSanitizeFiles();

  return (
    <div className="space-y-2">
      <Label className="font-semibold">Attachments</Label>
      <FileUpload
        onFileSelect={(newFiles) => {
          const sanitizedFiles = sanitizeFiles(newFiles);
          setFieldValue('files', [
            ...(values.files || []),
            ...sanitizedFiles.filter(
              (file) =>
                !(values.files || []).some(
                  (existingFile) => existingFile.name === file.name,
                ),
            ),
          ]);
        }}
        accept={{}} // Empty object means accept all file types
        maxFiles={30}
        files={values.files || []}
        setter={(files: File[]) => {
          const sanitizedFiles = sanitizeFiles(files);
          setFieldValue('files', sanitizedFiles);
        }}
      />
    </div>
  );
}
