import { Job } from "@/types/job";

export interface JobsTableProps {
  jobs: Job[];
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  setIsEditMode: (editMode: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
  setDuplicate: (x: boolean) => void;
  onEmailSettingsClick?: (job: Job) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

export type ColumnId = "applications" | "experience" | "skills" | string; // string for custom fields

export interface CustomFieldDef {
  label: string;
  showOnCard: boolean;
  jobId?: string;
}