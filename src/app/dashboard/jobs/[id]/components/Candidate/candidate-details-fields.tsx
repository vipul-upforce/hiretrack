"use client";

import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
// import ExpandableDescription from "../Utils/expand-collapse-desc";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";
import { RenderAttachments } from "../Utils/RenderAttachments";
import ResumeEvaluationDetails from "../Candidate/ResumeEvaluationDetails";
import { CandidateInfoSection } from "../Candidate/CandidateInfoSection";
import RenderHistoryEntry from "../Candidate/HistoryEntry";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { ICandidateHistory } from "@/lib/models/history";
import { IEditRemark } from "../../schemas/EditRemarkDialog";
import React from "react";

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

export const candidateDetailsFields: FieldConfig[] = [
  //   {
  //     label: "Job Description",
  //     render: (candidate: Candidate) => (
  //       <ExpandableDescription
  //         description={
  //           candidate.jobId?.description ||
  //           candidate.jobDetails?.description ||
  //           "No description Found"
  //         }
  //       />
  //     ),
  //     shouldRender: (candidate) =>
  //       !!candidate.jobId?.description || !!candidate.jobDetails?.description,
  //   },
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
        {candidate.skills.map((skill) => (
          <Badge key={skill} variant="secondary">
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
      onReEvaluate: () => void
    ) => (
      <ResumeEvaluationDetails
        labelClass={labelClass}
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
    label: "Candidate History",
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
      setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
    ) => (
      <ol className="relative border-s border-gray-200 dark:border-gray-700">
        {timeLineItems.length > 0
          ? timeLineItems
              .reverse()
              .filter((interview) => {
                if (!interview.remark || !interview.remark.description) {
                  return true;
                }
                return (
                  !interview.remark.isPrivate ||
                  user?.role === "hr" ||
                  user?.role === "admin"
                );
              })
              .map((interview, i) => {
                const timeDate = formatDate(interview.dateTime);
                const timeTime = formatTime(interview.dateTime);
                // console.log("INTERVEW: ", interview);

                // console.log(
                //   "⛔⛔⛔",
                //   JSON.stringify(
                //     typeof interview.currentInterviewer === "object" &&
                //       interview.currentInterviewer &&
                //       "email" in interview.currentInterviewer &&
                //       interview.currentInterviewer?.email
                //   )
                // );
                if (
                  typeof interview.currentInterviewer === "object" &&
                  interview.currentInterviewer &&
                  "email" in interview.currentInterviewer &&
                  typeof interview.previousInterviewer === "object" &&
                  interview.previousInterviewer &&
                  "email" in interview.previousInterviewer &&
                  interview.currentInterviewer !== null &&
                  interview.currentInterviewer?.email ==
                    interview.previousInterviewer?.email &&
                  (!interview.note || !interview.note.description)
                ) {
                  return;
                }
                return (
                  <RenderHistoryEntry
                    interview={interview}
                    indexKey={i}
                    localCandidate={candidate}
                    user={user}
                    timeDate={timeDate}
                    timeTime={timeTime}
                    handleRemarkUpdate={handleRemarkUpdate}
                    setEditingRemark={setEditingRemark}
                    setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
                    key={i}
                  />
                );
              })
          : "No History"}
      </ol>
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
    render: (candidate: Candidate) => (
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold">Interview Assignment</h3>
        {candidate.assignment ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>
                Interviewer:{" "}
                {typeof candidate.assignment.interviewerId === "object" &&
                candidate.assignment.interviewerId
                  ? candidate.assignment.interviewerId.name
                  : "Unknown"}
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
    ),
  },
];
