import { Candidate } from "@/types/candidate";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  IScheduledMailRequest,
  useSendMailMutation,
} from "./features/org/orgApi";
import { IJob } from "./models/job";
// import { toast } from "@/hooks/use-toast";
import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";

export const verifyAndDecryptToken = (token: string) => {
  try {
    const JWT_SECRET = "your_jwt_secret_key";
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

    const decoded = jwt.verify(token, JWT_SECRET);
    const bytes = CryptoJS.AES.decrypt(typeof decoded ==="object" ? decoded.user:{}, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (err) {
    throw Error(err instanceof Error ? err.message : "Unknown Error Occured");
  }
};

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
      // toast({
      //   title: "Error",
      //   description: "Email not sent.",
      //   variant: "destructive",
      // });
    }
  }
};
