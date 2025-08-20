"use client";

import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";
import { RenderAttachments } from "../Utils/RenderAttachments";
import ResumeEvaluationDetails from "../Candidate/ResumeEvaluationDetails";
import { CandidateInfoSection } from "../Candidate/CandidateInfoSection";

import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { ICandidateHistory } from "@/lib/models/history";
import { IEditRemark } from "../../schemas/EditRemarkDialog";
import React from "react";
import { HistoryAndLogTable } from "./HisotryAndLogTable";
// import { useDateFormatter } from "@/components/timezoneFormat/useGetFormattedTZ";
interface FieldConfig {
  label: string;
  id: string;
  render: (
    candidate: Candidate,
    user: User | null,
    ...args: any[]
  ) => React.ReactNode;
  shouldRender?: (candidate: Candidate) => boolean;
}

const labelClass = "font-semibold text-base";

// New HistorySection component to handle toggle

export const candidateDetailsFields: FieldConfig[] = [
  {
    label: "",
    id: "candidate-info",
    render: (candidate: Candidate, user: User | null) => (
      <CandidateInfoSection
        candidate={candidate}
        user={user}
        labelClass={labelClass}
      />
    ),
    shouldRender: (candidate) => !!candidate,
  },
  {
    label: "Skills",
    id: "skills",
    render: (candidate: Candidate) => (
      <div className="flex flex-wrap gap-2">
        {candidate.skills.map((skill, skillIndex) => (
          <Badge
            key={`${candidate._id}-skill-${skillIndex}-${skill}`}
            variant="secondary"
          >
            {skill}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    label: "",
    id: "metafields",
    render: (candidate: Candidate) => (
      // <CustomFieldsData
      //   customFields={{ customFields: candidate.customFields || {} } as any}
      // />
      <CustomFieldsData customFields={candidate.customFields || {}} />
    ),
    shouldRender: (candidate) =>
      candidate.customFields && Object.keys(candidate.customFields).length > 0
        ? true
        : false,
  },
  {
    label: "",
    id: "ai-evaluation",
    render: (
      candidate: Candidate,
      user: User | null,
      isReEvaluating: boolean,
      isEvaluatingFor: string,
      onReEvaluate: () => void
    ) => (
      <ResumeEvaluationDetails
        labelClass={labelClass}
        isEvaluatingFor={isEvaluatingFor}
        localCandidate={candidate}
        isReEvaluating={isReEvaluating}
        onReEvaluate={onReEvaluate}
      />
    ),
    shouldRender: (candidate) => !!candidate,
  },
  {
    label: "Resume",
    id: "resume",
    render: (candidate: Candidate) =>
      candidate.resume ? <PDFViewer files={[candidate.resume]} /> : null,
    shouldRender: (candidate) => !!candidate.resume,
  },
  {
    label: "",
    id: "attachments",
    render: (candidate: Candidate) => (
      <RenderAttachments labelClass={labelClass} localCandidate={candidate} />
    ),
    shouldRender: (candidate) => candidate.attachments.length > 0,
  },
  {
    label: "",
    id: "candidate-history",
    render: (
      candidate: Candidate,
      user: User | null,
      timeLineItems: ICandidateHistory[],
      handleRemarkUpdate: (
        id: string,
        description: string,
        isPrivate?: boolean
      ) => void,
      setEditingRemark: React.Dispatch<
        React.SetStateAction<IEditRemark | null>
      >,
      setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>,
      showHeader?: boolean
    ) => (
      <HistoryAndLogTable
        candidate={candidate}
        user={user}
        timeLineItems={timeLineItems}
        handleRemarkUpdate={handleRemarkUpdate}
        setEditingRemark={setEditingRemark}
        setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        showHeader={showHeader}
      />
    ),
    shouldRender: (candidate) =>
      candidate.history?.length && candidate.history?.length > 0 ? true : false,
  },
  {
    label: "Status History",
    id: "status-history",
    render: (candidate: Candidate) => (
      <div className="space-y-2">
        <div className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Created: {formatDate(candidate.tracking?.createdAt)}</span>
        </div>
        {candidate.tracking?.assignedToJobDate && (
          <div className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>
              Job Assigned: {formatDate(candidate.tracking?.assignedToJobDate)}
            </span>
          </div>
        )}
        <div className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Last Updated: {formatDate(candidate.tracking?.updatedAt)}</span>
        </div>
      </div>
    ),
  },
  {
    label: "",
    id: "interview-assignment",
    render: (candidate: Candidate) => {
      // Check if assignment exists and has valid interviewer data
      const hasValidInterviewer =
        candidate.assignment &&
        candidate.assignment.interviewerId &&
        typeof candidate.assignment.interviewerId === "object" &&
        candidate.assignment.interviewerId._id &&
        candidate.assignment.interviewerId.name;

      return (
        <div className="space-y-4 border-t pt-4">
          {/* <h3 className="font-semibold">Interview Assignment</h3> */}
          {hasValidInterviewer ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>
                  Interviewer:{" "}
                  {typeof candidate.assignment.interviewerId === "object" &&
                    candidate.assignment.interviewerId.name}
                </span>
              </div>
              <div>
                Interview Date: {formatDate(candidate.assignment.time)} on{" "}
                {formatTime(candidate.assignment.time)}
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
