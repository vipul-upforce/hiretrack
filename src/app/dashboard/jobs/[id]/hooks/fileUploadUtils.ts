import { v4 as uuidv4 } from "uuid";
import { Attachment } from "../schemas/AssignCandidateSchema";

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

// Function to convert a file to a data URL
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Handle file selection and renaming duplicates
export const handleFileSelect = async ({
  files,
  existingAttachments,
  currentFormAttachments,
  setFieldValue,
}: FileSelectParams): Promise<void> => {
  const newAttachments = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await readFileAsDataURL(file);
      let newFileName = file.name;

      // Check for duplicate names in existing candidate attachments or current form attachments
      if (
        existingAttachments.some(
          (existingFile) => existingFile.name === file.name
        ) ||
        currentFormAttachments.some(
          (existingFile) => existingFile.name === file.name
        )
      ) {
        const fileExtension = file.name.split(".").pop();
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
      }

      return {
        id: uuidv4(),
        name: newFileName,
        url: dataUrl,
        type: file.type,
        size: file.size,
      };
    })
  );

  setFieldValue("attachments", [...currentFormAttachments, ...newAttachments]);
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
      currentFormAttachments[index] ||
      currentFormAttachments.find((att) => att.size === file.size);

    if (existingAttachment) {
      return {
        ...existingAttachment,
        name: file.name,
        type: file.type,
      };
    } else {
      return {
        id: uuidv4(),
        name: file.name,
        url: "",
        type: file.type,
        size: file.size,
      };
    }
  });

  // Identify duplicate files
  const duplicateFiles = updatedAttachments.filter(
    (newFile) =>
      existingAttachments.some(
        (existingFile) => existingFile.name === newFile.name
      ) ||
      currentFormAttachments.some(
        (existingFile) => existingFile.name === newFile.name
      )
  );

  // Filter out duplicates to keep unique/renamed attachments
  const uniqueRenamedAttachments = updatedAttachments.filter(
    (newFile) =>
      !duplicateFiles.some((duplicate) => duplicate.name === newFile.name)
  );

  // Filter out attachments that are no longer selected
  const filteredSelectedFiles = currentFormAttachments.filter(
    (file) =>
      !uniqueRenamedAttachments.some((newFile) => newFile.id === file.id)
  );

  if (uniqueRenamedAttachments.length > 0) {
    setFieldValue("attachments", [
      ...filteredSelectedFiles,
      ...uniqueRenamedAttachments,
    ]);
  }
};
