import { Candidate } from '@/types/candidate';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  IScheduledMailRequest,
  IScheduledStatusMailRequest,
  useSendMailMutation,
  useSendStatusMailMutation,
} from './features/org/orgApi';
import { IJob } from './models/job';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sentAssignmentMail = async (
  result: Candidate,
  sendEmail: ReturnType<typeof useSendMailMutation>[0],
) => {
  // sending mail to assignmee after successfully updating candidate
  if (result.assignment) {
    const reqBody: IScheduledMailRequest = {
      id: result._id,
      email:
        typeof result.assignment.interviewerId === 'object'
          ? result.assignment.interviewerId.email
          : '',
      eventTitle:
        result.jobId
        && typeof result.jobId !== 'string'
        && (result.jobId as unknown as IJob).title
          ? `Interview for ${(result.jobId as unknown as IJob).title}`
          : 'Interview for Unknown Position',
      startTime: result.assignment?.time,
      endTime: result.assignment?.time,
      jobId: result.jobId._id,
      jobName:
        result.jobId
        && typeof result.jobId !== 'string'
        && (result.jobId as unknown as IJob).title
          ? (result.jobId as unknown as IJob).title
          : 'Unknown Job',
      interviewerName:
        typeof result.assignment.interviewerId === 'object'
          ? result.assignment.interviewerId.name
          : '',
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
export const sentStatusMailHandler = async (
  result: Candidate & { prev_status?: string },
  sendStatusMail: ReturnType<typeof useSendStatusMailMutation>[0],
) => {
  const latestRemark = result.remarks && result.remarks.length > 0
    ? result.remarks[result.remarks.length - 1]
    : null;
  // console.log("#$$$$$$$$$$$ ", result.prev_status);
  // console.log(result, "result");

  const reqBody: IScheduledStatusMailRequest = {
    id: result._id,
    // email:
    //   typeof result.assignment?.interviewerId === "object"
    //     ? result.assignment.interviewerId.email
    //     : "",

    eventTitle: `Status Updated for ${result.name}`,
    prev_status: result.prev_status || '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    jobId: result.jobId._id,
    jobName:
      result.jobId
      && typeof result.jobId !== 'string'
      && (result.jobId as unknown as IJob).title
        ? (result.jobId as unknown as IJob).title
        : 'Unknown Job',
    // interviewerName:
    //   latestRemark && typeof latestRemark.userId === "object"
    //     ? latestRemark.userId.name
    //     : "",

    candidateName: result.name,
    status: result.status,
    remark: latestRemark?.description || 'No Remark',
    rating: latestRemark?.rating?.toString() || 'No rating',
  };

  // console.log("#$$$$$$$$$$$ ", reqBody);

  const { error } = await sendStatusMail(reqBody);
  if (error) {
    // toast({
    //   title: "Error",
    //   description: "Email not sent.",
    //   variant: "destructive",
    // });
  }
};
// export const sentRemarkMail = async (
//   result: Candidate,
//   sendEmail: ReturnType<typeof useSendMailMutation>[0]
// ) => {
//   if (result.remarks && result.remarks.length > 0) {
//     const latestRemark = result.remarks[result.remarks.length - 1];
//     const reqBody: IScheduledMailRequest = {
//       email:
//         typeof result.assignment?.interviewerId === "object"
//           ? result.assignment.interviewerId.email
//           : "",
//       eventTitle: "New Remark Added",
//       startTime: new Date().toISOString(),
//       endTime: new Date().toISOString(),
//       jobName:
//         typeof result.jobId !== "string" && result.jobId
//           ? (result.jobId as IJob).title
//           : "Unknown Job",
//       interviewerName:
//         typeof latestRemark.userId === "object" ? latestRemark.userId.name : "",
//       candidateName: result.name,
//       status: result.status,
//       remark: latestRemark.description,
//       rating: latestRemark.rating?.toString() || "None",
//     };

//     const { error } = await sendEmail(reqBody);
//     if (error) {
//       // toast({
//       //   title: "Error",
//       //   description: "Email not sent.",
//       //   variant: "destructive",
//       // });
//     }
//   }
// };
export const sentUnAssignmentMail = async (
  result: Candidate,
  sendUnassignEmail: (data: { name: string }) => Promise<{ error?: string }>,
) => {
  // sending mail to assignmee after successfully updating candidate
  // console.log("UYIUYUYU outrside conditions");
  // if (result.assignment) {
  const reqBody = {
    // email:
    //   typeof result.assignment.interviewerId === "object"
    //     ? result.assignment.interviewerId.email
    //     : "",
    // eventTitle:
    //   result.jobId &&
    //   typeof result.jobId !== "string" &&
    //   (result.jobId as unknown as IJob).title
    //     ? "Interview for " + (result.jobId as unknown as IJob).title
    //     : "Interview for Unknown Position",
    // startTime: result.assignment?.time,
    // endTime: result.assignment?.time,
    jobName:
      result.jobId
      && typeof result.jobId !== 'string'
      && (result.jobId as unknown as IJob).title
        ? (result.jobId as unknown as IJob).title
        : 'Unknown Job',
    // interviewerName:
    //   typeof result.assignment.interviewerId === "object"
    //     ? result.assignment.interviewerId.name
    //     : "",
    name: result.name,
  };

  const { error } = await sendUnassignEmail(reqBody);
  if (error) {
    // toast({
    //   title: "Error",
    //   description: "Email not sent.",
    //   variant: "destructive",
    // });
  }
  // }
};
