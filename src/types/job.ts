import { ISalary } from '@/app/dashboard/jobs-board/schemas/job-schema';
import { JobExperience } from '@/lib/utils/job-experience';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';

export interface JobAssignment {
  interviewerId: string;
  assignedAt: Date;
  time: Date;
}

export interface Job {
  _id: string;
  organizationId?: string | object;
  title: string;
  // company?: string;
  description: string;
  promptForStatusChangeReason?: boolean;
  skills: string[];
  experience: JobExperience | number;
  isPublished?: boolean;
  links: string[];
  salary?: ISalary;
  // validTill?: Date;
  status: 'open' | 'closed' | 'draft';
  candidateCount?: number;
  attachments: {
    files: Array<{
      id: string;
      name: string;
      url: string;
      type: 'pdf';
      size: number;
    }>;
    images: Array<{
      id: string;
      name: string;
      url: string;
      type: 'image';
      size: number;
    }>;
  };
  tracking: {
    createdAt: Date;
    openedAt?: Date;
    closedAt?: Date;
    updatedAt: Date;
  };
  assignment?: JobAssignment;
  customFields: CustomFieldValues;
  isDeleted?: boolean;
}
