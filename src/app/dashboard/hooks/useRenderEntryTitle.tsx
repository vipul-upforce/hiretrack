"use client";

import { useCallback } from "react";
import type { Candidate, Remark } from "@/types/candidate";
import { ICandidateHistory } from "@/lib/models/history";


export function useRenderEntryTitle(interview: ICandidateHistory, localCandidate: Candidate) {
  const renderEntryTitle = useCallback(() => {
    const noteDescription =
      typeof interview?.note?.description === "string"
        ? interview.note.description
        : "";

    const showMainBlock =
      (interview.title !== "" || !interview.title) &&
      interview.title !== "Assigned to Job" &&
      !interview.title?.includes("Followup") &&
      !interview.title?.startsWith("Direct Email") &&
      !interview.title?.startsWith("Email sent: ") &&
      !interview.checklistForm &&
      !noteDescription.startsWith("Email sent");

    const UpdatedBySection = (
      <div className="flex flex-col items-end text-right">
        <p className="text-xs font-light text-gray-400">
          {interview?.assignmentBy && "Updated by"}
        </p>
        <p className="font-light text-gray-500 text-sm">
          {interview.assignmentBy &&
          typeof interview.assignmentBy === "object" &&
          "name" in interview.assignmentBy
            ? `${interview.assignmentBy.name}`
            : ""}
        </p>
      </div>
    );

    if (showMainBlock) {
      return (
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex flex-row w-[85%]">
            {interview.currentInterviewer &&
            typeof interview.currentInterviewer === "object" &&
            "name" in interview.currentInterviewer ? (
              interview.previousInterviewer &&
              typeof interview.previousInterviewer === "object" &&
              "name" in interview.previousInterviewer ? (
                <p className="pl-1">
                  {interview.previousInterviewer.name +
                    " → " +
                    interview.currentInterviewer.name}
                </p>
              ) : (
                <p className="pl-1">
                  {`Assigned to ${interview.currentInterviewer.name}`}
                </p>
              )
            ) : interview.remark && interview.remark.description ? (
              <p>{interview.title || "Remark Added"}</p>
            ) : interview.title === "Candidate Added" &&
              interview.assignmentBy ? (
              <p>
                {localCandidate.name} was added by{" "}
                {interview.assignmentBy &&
                typeof interview.assignmentBy === "object" &&
                "name" in interview.assignmentBy
                  ? `${interview.assignmentBy.name}`
                  : ""}
              </p>
            ) : interview.title === "Self Applied" ? (
              <p>{localCandidate.name} applied from portal</p>
            ) : interview.title?.includes("Updated") ? (
              <p>{interview.title}</p>
            ) : interview.title === "Archived" ? (
              <p>{localCandidate.name} was Archived</p>
            ) : interview.title === "Unarchived" ? (
              <p>{localCandidate.name} was Unarchived</p>
            ) : interview.title === "cv-process batch" ? (
              <p>{localCandidate.name} was added from CV Batch Upload</p>
            ) : interview?.previousInterviewer &&
              typeof interview.previousInterviewer === "object" &&
              "name" in interview.previousInterviewer ? (
              <p className="pl-1">
                Unassigned from {interview.previousInterviewer.name}
              </p>
            ) : null}
          </div>

          {UpdatedBySection}
        </div>
      );
    }

    // Default fallback (title only + updated by)
    return (
      <div className="flex flex-row items-start justify-between w-full">
        <span>{interview.title}</span>
        {interview.assignmentBy && UpdatedBySection}
      </div>
    );
  }, [interview, localCandidate]);

  return { renderEntryTitle };
}
