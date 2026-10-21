import { IChecklistField, UserRole } from '@/lib/models/JobLaneConfig';

/**
 * Core value type for checklist field values.
 * Represents all possible types that a checklist field can hold.
 */
export type ChecklistFieldValue =
  | string
  | string[]
  | number
  | boolean
  | Date
  | null;

/**
 * Metadata associated with a checklist field response.
 */
export interface ChecklistResponseMetadata {
  /** Display label for the field */
  fieldLabel?: string;
  /** Type of the field (e.g., 'text', 'number', 'date') */
  fieldType?: string;
  /** Array of user roles that can view this response in history */
  visibleInHistory?: UserRole[];
}

/**
 * Structure for a single checklist field response as stored in history.
 * This matches the exact structure used in ICandidateHistory['checklistForm']['responses'].
 * The fieldId is the key in the Map/Record, not stored in the response object itself.
 */
export interface ChecklistHistoryResponseItem {
  /** The actual value entered for this field */
  value: ChecklistFieldValue;
  /** Display label for the field */
  fieldLabel: string;
  /** Type of the field (e.g., 'text', 'number', 'date') */
  fieldType: string;
  /** Array of user roles that can view this response in history */
  visibleInHistory?: string[];
  /** Files attached to this field (for file type fields) */
  files?: CustomFieldFile[];
}

/**
 * Structure for a single checklist field response (for form usage).
 * Contains the field value and associated metadata.
 */
export interface ChecklistResponse extends ChecklistResponseMetadata {
  /** The actual value entered for this field */
  value: ChecklistFieldValue;
  /** Files attached to this field (for file type fields) */
  files?: CustomFieldFile[];
}

/**
 * Collection of checklist responses keyed by field ID.
 * Supports both Map (from MongoDB) and Record (serialized) formats.
 * This is the canonical type used in ICandidateHistory['checklistForm']['responses'].
 */
export type ChecklistResponses =
  | Map<string, ChecklistHistoryResponseItem>
  | Record<string, ChecklistHistoryResponseItem>;

/** File item: base64 when pending (before submit), url after upload. Stored in history with url only. */
export interface ChecklistFileItem {
  id?: string;
  name: string;
  url?: string;
  base64?: string;
  type: string;
  size: number;
}

/**
 * Handler function type for when a checklist field value changes.
 * For file-type fields, optional third arg is uploaded file metadata (with url) for download.
 */
export type ChecklistFieldChangeHandler = (
  fieldId: string,
  value: ChecklistFieldValue,
  files?: ChecklistFileItem[],
) => void;

/**
 * Form state structure for checklist forms.
 */
export interface ChecklistFormState {
  /** Current responses for all fields */
  responses: Record<string, ChecklistResponse | ChecklistHistoryResponseItem>;
  /** Validation errors keyed by field ID */
  errors: Record<string, string>;
  /** Touched state keyed by field ID */
  touched: Record<string, boolean>;
}

/**
 * Props for the ChecklistForm component.
 * Uses Record format for form responses (can contain ChecklistResponse or ChecklistHistoryResponseItem).
 */
export interface ChecklistFormProps {
  checklist: {
    id: string;
    name: string;
    description?: string;
    fields: IChecklistField[];
    isMandatory: boolean;
  };
  responses: Record<string, ChecklistResponse | ChecklistHistoryResponseItem>;
  onResponseChange: ChecklistFieldChangeHandler;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
}

/**
 * Remark structure for checklist submission.
 */
export interface ChecklistRemark {
  /** Description text of the remark */
  description: string;
  /** Whether the remark is private */
  isPrivate?: boolean;
  /** Rating value (0-5) */
  rating?: number;
}

/**
 * Complete checklist submission data payload.
 */
export interface ChecklistSubmissionData {
  /** ID of the checklist being submitted */
  checklistId: string;
  /** Name of the checklist */
  checklistName: string;
  /** Type of checklist: 'incoming' or 'outgoing' */
  checklistType: 'incoming' | 'outgoing';
  /** ID of the lane this checklist is for */
  laneId: string;
  /** Name of the lane */
  laneName: string;
  /** Responses for all fields */
  responses: ChecklistResponses;
  /** Optional remark associated with the submission */
  remark?: ChecklistRemark;
}

/**
 * Checklist form structure as stored in history entries.
 */
export interface ChecklistFormHistoryEntry {
  /** ID of the checklist */
  checklistId: string;
  /** Name of the checklist */
  checklistName: string;
  /** Type of checklist: 'incoming' or 'outgoing' */
  checklistType: 'incoming' | 'outgoing';
  /** ID of the lane */
  laneId: string;
  /** Name of the lane */
  laneName: string;
  /** Responses for all fields */
  responses: ChecklistResponses;
  /** Timestamp when checklist was completed */
  completedAt: Date | string;
  /** User who completed the checklist */
  completedBy:
    | string
    | {
        _id: string;
        name: string;
        email: string;
      };
}

/**
 * Type guard to check if a value is a valid ChecklistFieldValue.
 */
export function isChecklistFieldValue(
  value: unknown,
): value is ChecklistFieldValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    value === null ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

/**
 * Type guard to check if an object is a ChecklistResponse.
 */
export function isChecklistResponse(
  value: unknown,
): value is ChecklistResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return 'value' in obj && isChecklistFieldValue(obj.value);
}
