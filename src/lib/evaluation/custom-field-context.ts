export type CustomFieldPromptTarget = 'job' | 'candidate';

export type CustomFieldPromptScope =
  | 'global'
  | 'job-specific'
  | 'candidate-specific';

export interface EvaluationCustomFieldSelection {
  fieldId: string;
  formId: string;
  formName: string;
  label: string;
  target: CustomFieldPromptTarget;
  scope: CustomFieldPromptScope;
}

export const DEFAULT_CUSTOM_FIELDS_PROMPT_TEMPLATE = `These are our custom form fields, you can parse the label and its value and consider them in the evaluation if they affect the score of any individual points.

Job-related custom fields:

{job_custom_fields}

Candidate related custom fields (filled by the candidate):

{candidate_custom_fields}`;
