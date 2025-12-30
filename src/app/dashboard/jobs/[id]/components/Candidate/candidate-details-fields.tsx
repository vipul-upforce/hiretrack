'use client';

import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import CustomFieldsData from '@/Custom_Fields/Components/CustomFields/customFields-details';
import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import { ICandidateHistory } from '@/lib/models/history';
import React from 'react';
import { RenderAttachments } from '../Utils/RenderAttachments';
import ResumeEvaluationDetails from './ResumeEvaluationDetails';
import { CandidateInfoSection } from './CandidateInfoSection';

import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';
import { IEditRemark } from '../../schemas/EditRemarkDialog';
import { HistoryAndLogTable } from './history-and-log-table';
// import { useDateFormatter } from "@/components/timezoneFormat/useGetFormattedTZ";

/**
 * Discriminated union type for render function arguments for each field type
 */
type CandidateDetailsRenderArgs =
  | { id: 'candidate-info'; user: User | null }
  | { id: 'skills' }
  | { id: 'metafields' }
  | {
      id: 'ai-evaluation';
      isReEvaluating: boolean;
      isEvaluatingFor: string;
      onReEvaluate: () => void;
    }
  | { id: 'resume' }
  | { id: 'attachments' }
  | {
      id: 'candidate-history';
      timeLineItems: ICandidateHistory[];
      handleRemarkUpdate: (
        id: string,
        description: string,
        isPrivate?: boolean,
      ) => void;
      setEditingRemark: React.Dispatch<
        React.SetStateAction<IEditRemark | null>
      >;
      setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
      showHeader?: boolean;
    }
  | { id: 'status-history' }
  | { id: 'interview-assignment' };

interface FieldConfig<T extends CandidateDetailsRenderArgs> {
  label: string;
  id: T['id'];
  /**
   * Renders the field for candidate details.
   * The second argument must match the discriminated union for that id field.
   */
  render: (candidate: Candidate, args: T) => React.ReactNode;
  shouldRender?: (candidate: Candidate) => boolean;
}

const labelClass = 'font-semibold text-base';

/**
 * Field config for each candidate details section.
 * Type-safe and explicit on all possible args for each case.
 */
export const candidateDetailsFields: [
  FieldConfig<{ id: 'candidate-info'; user: User | null }>,
  FieldConfig<{ id: 'skills' }>,
  FieldConfig<{ id: 'metafields' }>,
  FieldConfig<{
    id: 'ai-evaluation';
    isReEvaluating: boolean;
    isEvaluatingFor: string;
    onReEvaluate: () => void;
  }>,
  FieldConfig<{ id: 'resume' }>,
  FieldConfig<{ id: 'attachments' }>,
  FieldConfig<{
    id: 'candidate-history';
    timeLineItems: ICandidateHistory[];
    handleRemarkUpdate: (
      id: string,
      description: string,
      isPrivate?: boolean,
    ) => void;
    setEditingRemark: React.Dispatch<React.SetStateAction<IEditRemark | null>>;
    setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    showHeader?: boolean;
  }>,
  FieldConfig<{ id: 'status-history' }>,
  FieldConfig<{ id: 'interview-assignment' }>,
] = [
  {
    label: '',
    id: 'candidate-info',
    render: (candidate, args) => (
      <CandidateInfoSection candidate={candidate} user={args.user} />
    ),
    shouldRender: (candidate) => !!candidate,
  },
  {
    label: 'Skills',
    id: 'skills',
    render: (candidate) => (
      <div className="flex flex-wrap gap-2">
        {candidate.skills.map((skill) => (
          <Badge key={`${candidate._id}-skill-${skill}`} variant="secondary">
            {skill}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    label: '',
    id: 'metafields',
    render: (candidate) => (
      <CustomFieldsData customFields={candidate.customFields || {}} />
    ),
    shouldRender: (candidate) =>
      !!(
        candidate.customFields && Object.keys(candidate.customFields).length > 0
      ),
  },
  {
    label: '',
    id: 'ai-evaluation',
    render: (candidate, args) => (
      <ResumeEvaluationDetails
        labelClass={labelClass}
        isEvaluatingFor={args.isEvaluatingFor}
        localCandidate={candidate}
        isReEvaluating={args.isReEvaluating}
        onReEvaluate={args.onReEvaluate}
      />
    ),
    shouldRender: (candidate) => !!candidate,
  },
  {
    label: 'Resume',
    id: 'resume',
    render: (candidate) =>
      candidate.resume ? <PDFViewer files={[candidate.resume]} /> : null,
    shouldRender: (candidate) => !!candidate.resume,
  },
  {
    label: '',
    id: 'attachments',
    render: (candidate) => (
      <RenderAttachments labelClass={labelClass} localCandidate={candidate} />
    ),
    shouldRender: (candidate) => candidate.attachments.length > 0,
  },
  {
    label: '',
    id: 'candidate-history',
    render: (candidate, args) => (
      <HistoryAndLogTable
        candidate={candidate}
        timeLineItems={args.timeLineItems}
        handleRemarkUpdate={args.handleRemarkUpdate}
        setEditingRemark={args.setEditingRemark}
        setIsEditRemarkDialogOpen={args.setIsEditRemarkDialogOpen}
        showHeader={args.showHeader}
      />
    ),
    shouldRender: (candidate) =>
      !!(candidate.history?.length && candidate.history?.length > 0),
  },
  {
    label: 'Status History',
    id: 'status-history',
    render: (candidate) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          <span>
            Created:
            {formatDate(candidate.tracking?.createdAt)}
          </span>
        </div>
        {candidate.tracking?.assignedToJobDate && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>
              Job Assigned: {formatDate(candidate.tracking?.assignedToJobDate)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          <span>
            Last Updated:
            {formatDate(candidate.tracking?.updatedAt)}
          </span>
        </div>
      </div>
    ),
  },
  {
    label: '',
    id: 'interview-assignment',
    render: (candidate) => {
      const hasValidInterviewer =
        candidate.assignment &&
        candidate.assignment.interviewerId &&
        typeof candidate.assignment.interviewerId === 'object' &&
        candidate.assignment.interviewerId._id &&
        candidate.assignment.interviewerId.name;

      return (
        <div className="space-y-4 border-t pt-4">
          {hasValidInterviewer ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>
                  Interviewer:{' '}
                  {typeof candidate.assignment?.interviewerId === 'object'
                    ? candidate.assignment?.interviewerId.name
                    : ''}
                </span>
              </div>
              <div>
                Interview Date: {formatDate(candidate.assignment?.time)} on{' '}
                {formatTime(candidate.assignment?.time)}
              </div>
            </div>
          ) : (
            <div>Not assigned to any interviewer</div>
          )}
        </div>
      );
    },
  },
];
