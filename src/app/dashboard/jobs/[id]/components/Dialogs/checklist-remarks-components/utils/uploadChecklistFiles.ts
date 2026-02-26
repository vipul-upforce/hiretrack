import type { ChecklistFileItem, ChecklistHistoryResponseItem } from '@/types/checklist';

export type UploadFilesFn = (params: {
  formData: FormData;
  organizationId: string;
}) => Promise<{ files?: Array<{ id: string; name: string; url: string; type: string; size: number }> }>;

/**
 * Uploads any checklist file fields that have base64 (pending) files.
 * Returns a new responses object with file URLs filled in; non-file or already-uploaded fields are unchanged.
 * @throws On upload failure (caller should handle and show toast).
 */
export async function uploadPendingChecklistFiles(
  responses: Record<string, ChecklistHistoryResponseItem>,
  uploadFiles: UploadFilesFn,
  organizationId: string,
): Promise<Record<string, ChecklistHistoryResponseItem>> {
  const resolved: Record<string, ChecklistHistoryResponseItem> = {};

  for (const [fieldId, response] of Object.entries(responses)) {
    if (response.fieldType !== 'file' || !Array.isArray(response.files)) {
      resolved[fieldId] = response;
      continue;
    }

    const filesOut: ChecklistFileItem[] = [];

    for (const file of response.files as ChecklistFileItem[]) {
      if (file.url) {
        filesOut.push(file);
        continue;
      }
      if (!file.base64) continue;

      const base64Data = file.base64.split(',')[1] || file.base64;
      const mimeType = file.type || 'application/octet-stream';
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const fileObj = new File([blob], file.name, { type: mimeType });
      const formData = new FormData();
      formData.append('attachments', fileObj);

      try {
        const result = await uploadFiles({ formData, organizationId });
        if (result.files?.[0]) {
          const f = result.files[0];
          filesOut.push({
            id: f.id,
            name: f.name,
            url: f.url,
            type: f.type,
            size: f.size,
          });
        }
      } catch {
        throw new Error(
          `Failed to upload ${file.name}. Please try again.`,
        );
      }
    }

    resolved[fieldId] = { ...response, files: filesOut };
  }

  return resolved;
}
