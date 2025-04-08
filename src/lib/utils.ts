import { Candidate } from "@/types/candidate";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  IScheduledMailRequest,
  useSendMailMutation,
} from "./features/org/orgApi";
import { IJob } from "./models/job";
import { toast } from "@/hooks/use-toast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sentAssignmentMail = async (
  result: Candidate,
  sendEmail: ReturnType<typeof useSendMailMutation>[0]
) => {
  //sending mail to assignmee after successfully updating candidate
  if (result.assignment) {
    const reqBody: IScheduledMailRequest = {
      email:
        typeof result.assignment.interviewerId === "object"
          ? result.assignment.interviewerId.email
          : "",
      eventTitle:
        result.jobId &&
        typeof result.jobId !== "string" &&
        (result.jobId as unknown as IJob).title
          ? "Interview for " + (result.jobId as unknown as IJob).title
          : "Interview for Unknown Position",
      startTime: result.assignment?.deadline,
      endTime: result.assignment?.deadline,
      jobName:
        result.jobId &&
        typeof result.jobId !== "string" &&
        (result.jobId as unknown as IJob).title
          ? (result.jobId as unknown as IJob).title
          : "Unknown Job",
      interviewerName:
        typeof result.assignment.interviewerId === "object"
          ? result.assignment.interviewerId.name
          : "",
      candidateName: result.name,
      status: result.status,
    };
    const { error } = await sendEmail(reqBody);
    if (error) {
      toast({
        title: "Error",
        description: "Email not sent.",
        variant: "destructive",
      });
    }
  }
};


