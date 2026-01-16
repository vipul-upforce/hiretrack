import { Candidate } from '@/types/candidate';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import {
  IScheduledMailRequest,
  IScheduledStatusMailRequest,
  useSendMailMutation,
  useSendStatusMailMutation,
} from './features/org/orgApi';
import { IJob } from './models/job';
import { generateOrgJwtSecret } from './jwtSecretGenerator';
import logger from './logger';

export const verifyAndDecryptToken = (token: string, orgId?: string) => {
  try {
    const JWT_SECRET = generateOrgJwtSecret(orgId as string);
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

    const decoded = jwt.verify(token, JWT_SECRET);
    const bytes = CryptoJS.AES.decrypt(
      typeof decoded === 'object' ? decoded.user : {},
      JWT_SECRET,
    );
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (err) {
    throw Error(err instanceof Error ? err.message : 'Unknown Error Occured');
  }
};
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
          ? (result.assignment.interviewerId?.email ?? '')
          : '',
      eventTitle:
        result.jobId &&
        typeof result.jobId !== 'string' &&
        (result.jobId as unknown as IJob).title
          ? `Interview for ${(result.jobId as unknown as IJob).title}`
          : 'Interview for Unknown Position',
      startTime: result.assignment?.time,
      endTime: result.assignment?.time,
      jobId: result.jobId._id,
      jobName:
        result.jobId &&
        typeof result.jobId !== 'string' &&
        (result.jobId as unknown as IJob).title
          ? (result.jobId as unknown as IJob).title
          : 'Unknown Job',
      interviewerName:
        typeof result.assignment.interviewerId === 'object'
          ? (result.assignment.interviewerId?.name ?? '')
          : '',
      candidateName: result.name,
      status: result.status,
      eventId: result.assignment.googleMeet?.eventId ?? '',
    };
    const { error } = await sendEmail(reqBody);
    if (error) {
      logger.error('Error sending assignment email:', error);
    }
  }
};
/**
 * Sends status update email notification
 * @param result - Candidate with optional prev_status
 * @param sendStatusMail - Status mail mutation function
 * @param options - Optional remark and rating to include in email
 */
export const sentStatusMailHandler = async (
  result: Candidate & { prev_status?: string },
  sendStatusMail: ReturnType<typeof useSendStatusMailMutation>[0],
  options?: {
    remark?: string;
    rating?: number | string;
  },
) => {
  const jobName =
    result.jobId &&
    typeof result.jobId !== 'string' &&
    (result.jobId as unknown as IJob).title
      ? (result.jobId as unknown as IJob).title
      : 'Unknown Job';

  const reqBody: IScheduledStatusMailRequest = {
    id: result._id,
    eventTitle: `Status Updated for ${result.name}`,
    prev_status: result.prev_status || '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    jobId: result.jobId._id,
    jobName,
    candidateName: result.name,
    status: result.status,
    remark: options?.remark ?? '',
    rating: options?.rating?.toString() ?? '',
  };

  await sendStatusMail(reqBody);
};

export const sentUnAssignmentMail = async (
  result: Candidate,
  sendUnassignEmail: (data: { name: string }) => Promise<{ error?: string }>,
) => {
  // sending mail to assignmee after successfully updating candidate

  const reqBody = {
    jobName:
      result.jobId &&
      typeof result.jobId !== 'string' &&
      (result.jobId as unknown as IJob).title
        ? (result.jobId as unknown as IJob).title
        : 'Unknown Job',
    name: result.name,
  };

  const { error } = await sendUnassignEmail(reqBody);
  if (error) {
    logger.error('Error sending unassignment email:', error);
  }
};
