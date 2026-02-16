/**
 * Shared one-by-one file upload for candidate flows (edit, create, guest apply).
 * Uploads resume, attachments, and custom field files in separate requests,
 * collects URLs, and returns them for the caller to send to the candidate API.
 */

export interface UploadedFileResult {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface UploadCandidateFilesResult {
  resume: UploadedFileResult | null;
  attachments: UploadedFileResult[];
  customFields: Record<string, UploadedFileResult[]>;
}

/** Values shape accepted by the helper (resume, attachments, customFields). */
export interface CandidateFileUploadValues {
  resume?: File | UploadedFileResult | null;
  attachments?: (File | UploadedFileResult)[];
  /** Per-field values (often arrays of File / base64 / existing file objects); only new files are uploaded. */
  customFields?: Record<string, unknown>;
}

export interface UploadCandidateFilesOptions {
  organizationId?: string;
  jobId?: string;
  /** Called when a single custom field file fails (we continue with others). */
  onCustomFieldUploadError?: (fieldKey: string, error: Error) => void;
}

type UploadFilesMutation = (arg: {
  formData: FormData;
  organizationId?: string;
  jobId?: string;
}) => { unwrap: () => Promise<{ files: UploadedFileResult[]; customFields?: Record<string, UploadedFileResult[]> }> };

function isNewCustomFieldFile(
  item: unknown,
): item is File | { base64: string; name: string; type: string; size: number } {
  if (item instanceof File) return true;
  return (
    typeof item === 'object' &&
    item !== null &&
    'base64' in item &&
    typeof (item as { base64: unknown }).base64 === 'string' &&
    ((item as { base64: string }).base64.startsWith('data:') ||
      (item as { base64: string }).base64.length > 0)
  );
}

function base64ToFile(
  item: { base64: string; name: string; type: string; size: number },
): File {
  const base64Data = item.base64.split(',')[1] || item.base64;
  const mimeType = item.type || 'application/octet-stream';
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], item.name, { type: mimeType });
}

/**
 * Upload candidate files one at a time and return collected URLs.
 * Use organizationId for authenticated users, jobId for guest apply.
 * Throws on resume/attachment upload failure; for custom field files, calls onCustomFieldUploadError and continues.
 */
export async function uploadCandidateFilesOneByOne(
  values: CandidateFileUploadValues,
  uploadFiles: UploadFilesMutation,
  options: UploadCandidateFilesOptions,
): Promise<UploadCandidateFilesResult> {
  const result: UploadCandidateFilesResult = {
    resume: null,
    attachments: [],
    customFields: {},
  };

  const hasResumeToUpload = values.resume instanceof File;
  const newAttachmentFiles = (values.attachments || []).filter(
    (file): file is File => file instanceof File,
  );
  const customFieldFilesToUpload: Record<
    string,
    (File | { base64: string; name: string; type: string; size: number })[]
  > = {};

  if (values.customFields) {
    for (const [fieldKey, fieldValue] of Object.entries(values.customFields)) {
      if (!Array.isArray(fieldValue) || fieldValue.length === 0) continue;
      const newFiles = fieldValue.filter(isNewCustomFieldFile);
      if (newFiles.length > 0) {
        customFieldFilesToUpload[fieldKey] = newFiles;
      }
    }
  }

  const hasFilesToUpload =
    hasResumeToUpload ||
    newAttachmentFiles.length > 0 ||
    Object.keys(customFieldFilesToUpload).length > 0;

  if (!hasFilesToUpload) {
    return result;
  }

  const { organizationId, jobId, onCustomFieldUploadError } = options;
  if (!organizationId && !jobId) {
    throw new Error('Either organizationId or jobId is required for file upload');
  }

  const uploadArg = organizationId
    ? { organizationId }
    : { jobId: jobId! };

  // 1. Resume (single upload)
  if (hasResumeToUpload && values.resume instanceof File) {
    const formData = new FormData();
    formData.append('resume', values.resume);
    const uploadResult = await uploadFiles({
      formData,
      ...uploadArg,
    }).unwrap();
    if (uploadResult.files?.length > 0) {
      result.resume = uploadResult.files[0];
    }
  }

  // 2. Attachments (one per request)
  for (const file of newAttachmentFiles) {
    const formData = new FormData();
    formData.append('attachments', file);
    const uploadResult = await uploadFiles({
      formData,
      ...uploadArg,
    }).unwrap();
    if (uploadResult.files?.length > 0) {
      result.attachments.push(...uploadResult.files);
    }
  }

  // 3. Custom field files (one per request per field)
  for (const [fieldKey, files] of Object.entries(customFieldFilesToUpload)) {
    const uploadedFiles: UploadedFileResult[] = [];

    for (const file of files) {
      try {
        let fileToUpload: File;
        if (file instanceof File) {
          fileToUpload = file;
        } else {
          fileToUpload = base64ToFile(file);
        }

        const formData = new FormData();
        formData.append(`customField_${fieldKey}_0`, fileToUpload);

        const uploadResult = await uploadFiles({
          formData,
          ...uploadArg,
        }).unwrap();

        if (uploadResult.customFields?.[fieldKey]?.length) {
          uploadedFiles.push(...uploadResult.customFields[fieldKey]);
        } else if (uploadResult.files?.length > 0) {
          uploadedFiles.push(...uploadResult.files);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onCustomFieldUploadError?.(fieldKey, error);
      }
    }

    if (uploadedFiles.length > 0) {
      result.customFields[fieldKey] = uploadedFiles;
    }
  }

  return result;
}
