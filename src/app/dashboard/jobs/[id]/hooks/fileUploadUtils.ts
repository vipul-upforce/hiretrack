import { v4 as uuidv4 } from 'uuid';
import { Attachment } from '../schemas/AssignCandidateSchema';

interface FileSelectParams {
  files: File[];
  existingAttachments: Attachment[];
  currentFormAttachments: Attachment[];
  setFieldValue: (field: string, value: Attachment[]) => void;
}

interface SetterParams {
  uiFiles: File[];
  existingAttachments: Attachment[];
  currentFormAttachments: Attachment[];
  setFieldValue: (field: string, value: Attachment[]) => void;
}

interface UploadAttachmentsParams {
  attachments: Attachment[];
  uploadFiles: (arg: {
    formData: FormData;
    organizationId?: string;
    jobId?: string;
  }) => {
    unwrap: () => Promise<{
      files: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
      }>;
    }>;
  };
  organizationId?: string;
  jobId?: string;
}

// Function to convert a file to a data URL
export const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Handle file selection and renaming duplicates
export const handleFileSelect = async ({
  files,
  existingAttachments,
  currentFormAttachments,
  setFieldValue,
}: FileSelectParams): Promise<void> => {
  // const { sanitizeFiles } = useSanitizeFiles();
  //  const sanitizedFiles = files(files);
  const newAttachments = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await readFileAsDataURL(file);
      let newFileName = file.name;

      // Check for duplicate names in existing candidate attachments or current form attachments
      if (
        existingAttachments.some(
          (existingFile) => existingFile.name === file.name,
        ) ||
        currentFormAttachments.some(
          (existingFile) => existingFile.name === file.name,
        )
      ) {
        const fileExtension = file.name.split('.').pop();
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
      }

      return {
        id: uuidv4(),
        name: newFileName,
        url: dataUrl,
        type: file.type,
        size: file.size,
      };
    }),
  );

  setFieldValue('attachments', [...currentFormAttachments, ...newAttachments]);
};

// Handle setter logic for updating attachments
export const handleSetter = ({
  uiFiles,
  existingAttachments,
  currentFormAttachments,
  setFieldValue,
}: SetterParams): void => {
  const fileIndexMap = new Map();
  uiFiles.forEach((file, index) => {
    fileIndexMap.set(file, index);
  });

  const updatedAttachments = uiFiles.map((file, index) => {
    const existingAttachment =
      currentFormAttachments.at(index) ||
      currentFormAttachments.find((att) => att.size === file.size);

    if (existingAttachment) {
      return {
        ...existingAttachment,
        name: file.name,
        type: file.type,
      };
    }
    return {
      id: uuidv4(),
      name: file.name,
      url: '',
      type: file.type,
      size: file.size,
    };
  });

  // Identify duplicate files
  const duplicateFiles = updatedAttachments.filter(
    (newFile) =>
      existingAttachments.some(
        (existingFile) => existingFile.name === newFile.name,
      ) ||
      currentFormAttachments.some(
        (existingFile) => existingFile.name === newFile.name,
      ),
  );

  // Filter out duplicates to keep unique/renamed attachments
  updatedAttachments.filter(
    (newFile) =>
      !duplicateFiles.some((duplicate) => duplicate.name === newFile.name),
  );
  setFieldValue('attachments', updatedAttachments);
};

/**
 * Uploads attachment files that are base64 data URLs or File objects.
 * Returns attachments with uploaded URLs, keeping existing uploaded files as-is.
 */
export const uploadAttachments = async ({
  attachments,
  uploadFiles,
  organizationId,
  jobId,
}: UploadAttachmentsParams): Promise<Attachment[]> => {
  let uploadArg: { organizationId: string } | { jobId: string } | null;
  if (organizationId) {
    uploadArg = { organizationId };
  } else if (jobId) {
    uploadArg = { jobId };
  } else {
    uploadArg = null;
  }

  if (!uploadArg) {
    throw new Error('Either organizationId or jobId is required for file upload');
  }

  const uploadedAttachments: Attachment[] = [];

  for (const attachment of attachments) {
    // If already uploaded (has URL that's not base64), keep as-is
    if (attachment.url && !attachment.url.startsWith('data:')) {
      uploadedAttachments.push(attachment);
      continue;
    }

    // If it's a base64 data URL, convert to File and upload
    if (attachment.url && attachment.url.startsWith('data:')) {
      try {
        const base64Data = attachment.url.split(',')[1] || attachment.url;
        const mimeType = attachment.type || 'application/octet-stream';
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i += 1) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const fileObj = new File([blob], attachment.name, { type: mimeType });

        const formData = new FormData();
        formData.append('attachments', fileObj);
        const result = await uploadFiles({
          formData,
          ...uploadArg,
        }).unwrap();

        if (result.files?.[0]) {
          const uploadedFile = result.files[0];
          uploadedAttachments.push({
            id: uploadedFile.id,
            name: attachment.name,
            url: uploadedFile.url,
            type: uploadedFile.type,
            size: uploadedFile.size,
          });
        } else {
          // If upload fails, keep original (will be handled by error handling)
          uploadedAttachments.push(attachment);
        }
      } catch (error) {
        // On error, keep original attachment
        console.error('Failed to upload attachment:', error);
        uploadedAttachments.push(attachment);
      }
    } else {
      // If no URL, keep as-is (shouldn't happen, but safe fallback)
      uploadedAttachments.push(attachment);
    }
  }

  return uploadedAttachments;
};
