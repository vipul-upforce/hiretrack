import { Field, FieldProps, useFormikContext, FormikProps } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import React from 'react';
import { Rating } from '@mui/material';
import { Paperclip, FileIcon, X } from 'lucide-react';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { Candidate } from '@/types/candidate';
import { User, FormValues } from '../../../schemas/AssignCandidateSchema';
import { handleFileSelect } from '../../../hooks/fileUploadUtils';

interface AssignmentDetailsSectionProps {
  user: User | null;
  candidate: Candidate;
  getOnAltEnterSubmit: (
    values: FormValues,
    formikHelpers: FormikProps<FormValues>,
    isSubmitting: boolean,
  ) => (fieldValue: string) => (e: React.KeyboardEvent) => void;
  isSubmitting: boolean;
  formikProps: FormikProps<FormValues>;
}

export function AssignmentDetailsSection({
  user,
  candidate,
  getOnAltEnterSubmit,
  isSubmitting,
  formikProps,
}: AssignmentDetailsSectionProps) {
  const { values, setFieldValue } = useFormikContext<FormValues>();
  const { sanitizeFiles } = useSanitizeFiles();

  return (
    <>
      <div className="space-y-4">
        <Field name="remark">
          {({ field }: FieldProps) => (
            <MentionTextarea
              placeholder="Add a remark... (Alt+Enter to submit)"
              value={field.value || ''}
              onChange={(value: string) => setFieldValue('remark', value)}
              onKeyDown={getOnAltEnterSubmit(
                values,
                formikProps,
                isSubmitting,
              )(field.value)}
              organizationId={user?.organizationInfo?._id || ''}
              currentUserRole={user?.role || ''}
              rows={3}
            />
          )}
        </Field>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="rating">Rating:</Label>
            <Field name="rating">
              {({ field }: FieldProps<{ value: number | null }>) => (
                <Rating
                  name="rating"
                  value={typeof field.value === 'number' ? field.value : null}
                  onChange={(_event, value) => setFieldValue('rating', value)}
                  precision={0.5}
                />
              )}
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Attachments</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex h-8 items-center gap-2"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.onchange = (e) => {
                  const { files } = e.target as HTMLInputElement;
                  if (files && files.length > 0) {
                    const sanitizedFiles = sanitizeFiles(Array.from(files));
                    handleFileSelect({
                      files: sanitizedFiles,
                      existingAttachments: candidate.attachments,
                      currentFormAttachments: values.attachments,
                      setFieldValue,
                    });
                  }
                };
                input.click();
              }}
            >
              <Paperclip className="h-3 w-3" />
              Add Files
            </Button>
            <span className="text-xs text-muted-foreground">Max 30 files</span>
          </div>

          {values.attachments && values.attachments.length > 0 && (
            <div className="space-y-1">
              {values.attachments.map((att, index: number) => (
                <div
                  key={att.name}
                  className="flex items-center justify-between rounded border border-gray-200 bg-white p-1.5 text-xs dark:bg-black"
                >
                  <div className="flex items-center gap-1">
                    <FileIcon className="h-3 w-3 text-gray-500" />
                    <span className="truncate">{att.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updatedFiles = values.attachments?.filter(
                        (_, i: number) => i !== index,
                      );
                      setFieldValue('attachments', updatedFiles);
                    }}
                    className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
