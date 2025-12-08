import { IEmailTemplate } from '@/app/dashboard/settings/components/types';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export const jobD = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">New Job Application Received</h2>
        <p style="margin: 0 0 15px 0;">A new application has been submitted for the following position:</p>

        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Position:</strong> {{jobTitle}}</p>
            <p style="margin: 5px 0;"><strong>Candidate:</strong> {{candidateName}}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> {{candidateEmail}}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> {{candidatePhone}}</p>
            <p style="margin: 5px 0;"><strong>Application Date:</strong> {{applicationDate}}</p>
        </div>

        <p style="margin: 15px 0;">Please review the application in the dashboard.</p>
        <p style="margin: 15px 0;"><a href="{{dashboardLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Application</a></p>
    </div>
</div>`;

export const ResetP = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h2>
        <p style="margin: 0 0 15px 0;">Hello {{userName}},</p>

        <p style="margin: 0 0 15px 0;">We received a request to reset your password for your {{organizationName}} account.</p>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0 0 10px 0;"><strong>If you requested this password reset:</strong></p>
            <p style="margin: 0;">Click the button below to reset your password. This link will expire in 24 hours.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>

        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <p style="margin: 0 0 10px 0;"><strong>If you didn't request this:</strong></p>
            <p style="margin: 0;">Please ignore this email. Your password will remain unchanged.</p>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`;

export const assE = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Interview Assignment</h2>
        <p style="margin: 0 0 15px 0;">Hello {{interviewerName}},</p>

        <p style="margin: 0 0 15px 0;">You have been assigned to conduct an interview for the following candidate:</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Interview Details</h3>
            <p style="margin: 5px 0;"><strong>Candidate:</strong> {{candidateName}}</p>
            <p style="margin: 5px 0;"><strong>Position:</strong> {{jobTitle}}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {{interviewDate}}</p>           
            <p style="margin: 5px 0;"><strong>Type:</strong> {{interviewType}}</p>
            <p style="margin: 5px 0;"><strong>Meeting Link:</strong> 
             <div style="text-align: center; margin: 20px 0;">
            <a href="{{meetingLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">Google Calendar</a>
            <a href="{{outlookCalendarLink}}" style="background-color: #007bdf; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Outlook Calendar</a>
        </div>
            </p>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li style="margin: 5px 0;">Review the candidate's profile and resume</li>
                <li style="margin: 5px 0;">Prepare interview questions</li>
                <li style="margin: 5px 0;">Join the meeting at the scheduled time</li>
                <li style="margin: 5px 0;">Submit feedback after the interview</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{candidateProfileLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">View Candidate</a>
            <a href="{{dashboardLink}}" style="background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Dashboard</a>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team</p>
    </div>
</div>`;

export const StatusU = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Application Status Update</h2>
        <p style="margin: 0 0 15px 0;">Dear {{candidateName}},</p>

        <p style="margin: 0 0 15px 0;">We wanted to update you on the status of your application for the <strong>{{jobTitle}}</strong> position at {{organizationName}}.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Current Status</h3>
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0056b3;">{{newStatus}}</p>
            </div>
            <p style="margin: 15px 0 0 0;">{{statusMessage}}</p>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
            <p style="margin: 0;">{{nextSteps}}</p>
        </div>

        <p style="margin: 15px 0;">Thank you for your continued interest in joining our team. If you have any questions, please don't hesitate to reach out.</p>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team<br>{{hrContactInfo}}</p>
    </div>
</div>`;

export const RemA = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;margin-bottom: 15px;">New Feedback Added</h2>

        <p style="margin: 0 0 15px 0;">New feedback has been added for candidate <strong>{{candidateName}}</strong> applying for the <strong>{{jobTitle}}</strong> position.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Feedback Details</h3>
            <p style="margin: 5px 0;"><strong>Added by:</strong> {{reviewerName}}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {{remarkDate}}</p>
            <p style="margin: 5px 0;"><strong>Rating:</strong> {{rating}}/5</p>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Comments:</strong></p>
                <p style="margin: 0;">{{remarkText}}</p>
            </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{candidateProfileLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Profile</a>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`;

export const MAD = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">Interview Step Completed</h2>
       

        <p style="margin: 0 0 15px 0;">An interview step has been completed for candidate <strong>{{candidateName}}</strong> applying for the <strong>{{jobTitle}}</strong> position.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Completed Step</h3>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-weight: bold; color: #155724;">{{stepName}}</p>
                <p style="margin: 5px 0 0 0;">Completed by: {{completedBy}}</p>
                <p style="margin: 5px 0 0 0;">Date: {{completionDate}}</p>
            </div>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0 0 10px 0;"><strong>Feedback:</strong></p>
            <p style="margin: 0;">{{feedback}}</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
            <p style="margin: 0;"><strong>Next Step:</strong> {{nextStep}}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{candidateProfileLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Candidate Progress</a>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`;

export const OTP = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">OTP Verification</h2>
        <p style="margin: 0 0 15px 0;">Hello {{userName}},</p>

        <p style="margin: 0 0 15px 0;">You have requested a One-Time Password (OTP) for your {{organizationName}} account verification.</p>

        <div style="background-color: white; padding: 30px; border-radius: 5px; margin: 30px 0; border: 2px solid #007bff; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
            <p style="margin: 15px 0 0 0; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">{{otpCode}}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0 0 10px 0;"><strong>Important:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li style="margin: 5px 0;">This OTP is valid for {{expirationTime}} minutes only</li>
                <li style="margin: 5px 0;">Do not share this code with anyone</li>
                <li style="margin: 5px 0;">If you didn't request this OTP, please ignore this email</li>
            </ul>
        </div>

        <p style="margin: 15px 0;">If you're having trouble accessing your account, please contact our support team.</p>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Security Team</p>
    </div>
</div>`;

export const defaultTemplates: EmailTemplate[] = [
  {
    id: 'job-application-hr',
    name: 'Job Application (HR Notification)',
    subject: 'New Job Application - {{jobTitle}}',
    content: jobD,
    variables: [
      'jobTitle',
      'candidateName',
      'candidateEmail',
      'candidatePhone',
      'applicationDate',
      'dashboardLink',
    ],
  },
  {
    id: 'password-reset',
    name: 'Password Reset Request',
    subject: 'Password Reset Request - {{organizationName}}',
    content: ResetP,
    variables: ['userName', 'organizationName', 'resetLink'],
  },
  {
    id: 'interview-assignment',
    name: 'Interview Assignment Event',
    subject: 'Interview Assigned - {{candidateName}} for {{jobTitle}}',
    content: assE,
    variables: [
      'interviewerName',
      'candidateName',
      'jobTitle',
      'interviewDate',
      // "interviewTime",
      // "duration",
      'interviewType',
      'meetingLink',
      'outlookCalendarLink',
      'candidateProfileLink',
      'dashboardLink',
      'organizationName',
    ],
  },
  {
    id: 'status-update',
    name: 'Status Update Notification',
    subject: 'Application Status Update - {{jobTitle}}',
    content: StatusU,
    variables: [
      'candidateName',
      'jobTitle',
      'organizationName',
      'newStatus',
      'statusMessage',
      'nextSteps',
      'hrContactInfo',
    ],
  },
  {
    id: 'new-remark',
    name: 'New Remark Added',
    subject: 'New Feedback Added - {{candidateName}}',
    content: RemA,
    variables: [
      // "recipientName",
      'candidateName',
      'jobTitle',
      'reviewerName',
      'remarkDate',
      'rating',
      'remarkText',
      'candidateProfileLink',
      'organizationName',
    ],
  },
  {
    id: 'step-completed',
    name: 'Step Completed',
    subject: 'Interview Step Completed - {{candidateName}}',
    content: MAD,
    variables: [
      // "recipientName",
      'candidateName',
      'jobTitle',
      'stepName',
      'completedBy',
      'completionDate',
      'feedback',
      'nextStep',
      'candidateProfileLink',
      'organizationName',
    ],
  },
  {
    id: 'send-otp',
    name: 'Send OTP',
    subject: 'Your OTP Code - {{organizationName}}',
    content: OTP,
    variables: ['userName', 'organizationName', 'otpCode', 'expirationTime'],
  },
];

export const Data = {
  orgName: 'Acme Inc',
  candidateName: 'John Doe',
  jobName: 'Senior Developer',
  email: 'john.doe@example.com',
  status: 'Applied',
  applicationDate: '2024-01-15',
  hrNotificationTitle: 'New Job Application Received',
  candidateDetails: 'https://example.com/candidate/123',
  resetUrl: 'https://example.com/reset?token=abc123',
  eventTitle: 'Interview Scheduled',
  interviewerName: 'Jane Smith',
  startDate: '2024-01-20 10:00 AM',
  candidateDetailsPage: 'https://example.com/candidate/123',
  googleCalendarLink:
    'https://calendar.google.com/calendar/render?action=TEMPLATE',
  outlookCalendarLink: 'https://outlook.live.com/calendar/0/deeplink/compose',
  eventSubTitle: 'Status has been updated for this candidate',
  actionBy: 'HR Manager',
  remark: 'Great technical skills, good communication',
  rating: '4.5/5',
  remark_for: 'John Doe',
  remark_adder: 'Technical Lead',
  unassigner: 'HR Manager',
  candidate_name: 'John Doe',
  otp: '234533',
};

export const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
  formatOnPaste: true,
  formatOnType: true,
};

export const defaultTemplatesFE: { [key: string]: IEmailTemplate } = {
  'job-application-hr': {
    templateId: 'job-application-hr',
    templateName: 'Job Application (HR Notification)',
    subject: 'New Job Application - {{jobTitle}}',
    html: jobD,
    variables: [
      'jobTitle',
      'candidateName',
      'candidateEmail',
      'candidatePhone',
      'applicationDate',
      'dashboardLink',
    ],
  },
  'password-reset': {
    templateId: 'password-reset',
    templateName: 'Password Reset Request',
    subject: 'Password Reset Request - {{organizationName}}',
    html: ResetP,
    variables: ['userName', 'organizationName', 'resetLink'],
  },
  'interview-assignment': {
    templateId: 'interview-assignment',
    templateName: 'Interview Assignment Event',
    subject: 'Interview Assigned - {{candidateName}} for {{jobTitle}}',
    html: assE,
    variables: [
      'interviewerName',
      'candidateName',
      'jobTitle',
      'interviewDate',
      // "interviewTime",
      // "duration",
      'interviewType',
      'meetingLink',
      'outlookCalendarLink',
      'candidateProfileLink',
      'dashboardLink',
      'organizationName',
    ],
  },
  'status-update': {
    templateId: 'status-update',
    templateName: 'Status Update Notification',
    subject: 'Application Status Update - {{jobTitle}}',
    html: StatusU,
    variables: [
      'candidateName',
      'jobTitle',
      'organizationName',
      'newStatus',
      'statusMessage',
      'nextSteps',
      'hrContactInfo',
    ],
  },
  'new-remark': {
    templateId: 'new-remark',
    templateName: 'New Remark Added',
    subject: 'New Feedback Added - {{candidateName}}',
    html: RemA,
    variables: [
      // "recipientName",
      'candidateName',
      'jobTitle',
      'reviewerName',
      'remarkDate',
      'rating',
      'remarkText',
      'candidateProfileLink',
      'organizationName',
    ],
  },
  'step-completed': {
    templateId: 'step-completed',
    templateName: 'Step Completed',
    subject: 'Interview Step Completed - {{candidateName}}',
    html: MAD,
    variables: [
      // "recipientName",
      'candidateName',
      'jobTitle',
      'stepName',
      'completedBy',
      'completionDate',
      'feedback',
      'nextStep',
      'candidateProfileLink',
      'organizationName',
    ],
  },
  'send-otp': {
    templateId: 'send-otp',
    templateName: 'Send OTP',
    subject: 'Your OTP Code - {{organizationName}}',
    html: OTP,
    variables: ['userName', 'organizationName', 'otpCode', 'expirationTime'],
  },
};

export const wierdFileNamePattern = /[^a-zA-Z0-9(). ]/g;

export const followUpSepretorPatternRegex = /\|\|\|\|\|\n/g;

export const scoreColors: Record<
  number,
  {
    bg: string;
    text: string;
    border: string;
    dark: { bg: string; text: string; border: string };
  }
> = {
  1: {
    bg: 'rgba(254, 202, 202, 1)', // bg-red-200
    text: 'rgba(127, 29, 29, 1)', // text-red-900 - darker for better contrast
    border: 'rgba(252, 165, 165, 1)', // border-red-300
    dark: {
      bg: 'rgba(185, 28, 28, 0.2)', // dark:bg-red-900/20
      text: 'rgba(252, 165, 165, 1)', // dark:text-red-300
      border: 'rgba(159, 18, 18, 1)', // dark:border-red-700
    },
  },
  2: {
    bg: 'rgba(254, 226, 226, 1)', // bg-red-100
    text: 'rgba(153, 27, 27, 1)', // text-red-800 - darker for better contrast
    border: 'rgba(254, 202, 202, 1)', // border-red-200
    dark: {
      bg: 'rgba(185, 28, 28, 0.1)', // dark:bg-red-900/10
      text: 'rgba(239, 68, 68, 1)', // dark:text-red-400
      border: 'rgba(153, 27, 27, 1)', // dark:border-red-800
    },
  },
  3: {
    bg: 'rgba(254, 226, 226, 1)', // bg-red-100
    text: 'rgba(153, 27, 27, 1)', // text-red-800 - darker for better contrast
    border: 'rgba(254, 202, 202, 1)', // border-red-200
    dark: {
      bg: 'rgba(185, 28, 28, 0.1)', // dark:bg-red-900/10
      text: 'rgba(239, 68, 68, 1)', // dark:text-red-400
      border: 'rgba(153, 27, 27, 1)', // dark:border-red-800
    },
  },
  4: {
    bg: 'rgba(255, 237, 213, 1)', // bg-orange-100
    text: 'rgba(194, 65, 12, 1)', // text-orange-800 - darker for better contrast
    border: 'rgba(251, 191, 36, 1)', // border-orange-200
    dark: {
      bg: 'rgba(234, 88, 12, 0.1)', // dark:bg-orange-900/10
      text: 'rgba(249, 115, 22, 1)', // dark:text-orange-400
      border: 'rgba(194, 65, 12, 1)', // dark:border-orange-800
    },
  },
  // Average (5): Amber theme
  5: {
    bg: 'rgba(254, 243, 199, 1)', // bg-amber-50 - fixed alpha value
    text: 'rgba(180, 83, 9, 1)', // text-amber-800 - darker for better contrast
    border: 'rgba(252, 211, 77, 1)', // border-amber-200
    dark: {
      bg: 'rgba(146, 64, 14, 0.1)', // dark:bg-amber-900/10
      text: 'rgba(251, 191, 36, 1)', // dark:text-amber-400
      border: 'rgba(180, 83, 9, 1)', // dark:border-amber-800
    },
  },
  // Above Average (6): Lime theme
  6: {
    bg: 'rgba(236, 252, 203, 1)', // bg-lime-100 - corrected from lime-500
    text: 'rgba(77, 124, 15, 1)', // text-lime-800 - darker for better contrast
    border: 'rgba(190, 242, 100, 1)', // border-lime-200
    dark: {
      bg: 'rgba(77, 124, 15, 0.1)', // dark:bg-lime-900/10
      text: 'rgba(163, 230, 53, 1)', // dark:text-lime-400
      border: 'rgba(77, 124, 15, 1)', // dark:border-lime-800
    },
  },
  // Good (7): Teal theme
  7: {
    bg: 'rgba(204, 251, 241, 1)', // bg-teal-100
    text: 'rgba(19, 78, 74, 1)', // text-teal-800 - darker for better contrast
    border: 'rgba(45, 212, 191, 1)', // border-teal-200
    dark: {
      bg: 'rgba(17, 94, 89, 0.1)', // dark:bg-teal-900/10
      text: 'rgba(45, 212, 191, 1)', // dark:text-teal-400
      border: 'rgba(19, 78, 74, 1)', // dark:border-teal-800
    },
  },
  8: {
    bg: 'rgba(204, 251, 241, 1)', // bg-teal-100
    text: 'rgba(17, 94, 89, 1)', // text-teal-900 - darker for better contrast
    border: 'rgba(45, 212, 191, 1)', // border-teal-200
    dark: {
      bg: 'rgba(17, 94, 89, 0.1)', // dark:bg-teal-900/10
      text: 'rgba(45, 212, 191, 1)', // dark:text-teal-400
      border: 'rgba(19, 78, 74, 1)', // dark:border-teal-800
    },
  },
  // Excellent (9-10): Green theme
  9: {
    bg: 'rgba(209, 250, 229, 1)', // bg-emerald-100
    text: 'rgba(6, 95, 70, 1)', // text-emerald-800 - darker for better contrast
    border: 'rgba(52, 211, 153, 1)', // border-emerald-200
    dark: {
      bg: 'rgba(6, 78, 59, 0.1)', // dark:bg-emerald-900/10
      text: 'rgba(52, 211, 153, 1)', // dark:text-emerald-400
      border: 'rgba(6, 95, 70, 1)', // dark:border-emerald-800
    },
  },
  10: {
    bg: 'rgba(220, 252, 231, 1)', // bg-green-100
    text: 'rgba(22, 101, 52, 1)', // text-green-800 - darker for better contrast
    border: 'rgba(74, 222, 128, 1)', // border-green-200
    dark: {
      bg: 'rgba(20, 83, 45, 0.1)', // dark:bg-green-900/10
      text: 'rgba(74, 222, 128, 1)', // dark:text-green-400
      border: 'rgba(22, 101, 52, 1)', // dark:border-green-800
    },
  },
};


export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/signup',
    '/api/:path*',
    '/:orgName/:path*',
    '/backups',
    '/take-snapshot',
  ],
};

export const unauthorizedInterviewerPages = [
  '/jobs-board',
  '/jobs',
  '/auth/signup',
  '/dashboard/settings',
  '/dashboard/search',
  '/dashboard/cv-upload',
  '/dashboard/analytics',
  '/api/organization/tags',
];

export const unauthorizedInterviewerAPIRoutes = ['/api/candidates/filter'];

export const unauthorizedCandidateAPIRoutes = [
  '/api/candidates/assignments',
  '/dashboard',
  '/api/candidates/assignments',
  '/dashboard/:path*',
  '/api/nginx-logs',
  '/api/download/assets',
];
export const apiExemptPaths = [
  '/api/jobs/open-jobs',
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/signup',
  '/api/organization',
  '/api/orgs',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/event-mail',
  '/api/candidates/signup',
  '/api/candidates/evaluate',
  '/api/candidates/event-mail',
  '/api/files',
  '/api/file-proxy',
  '/api/file',
  '/api/candidates/guest-apply',
  '/api/candidates/apply-application',
  '/apply-jobs',
  '/api/organization/cs/',
  '/api/auth/2fa/send-otp',
  '/api/auth/2fa/verify-otp',
  '/api/settings/twofa',
  '/api/settings/portal',
  '/api/shared-files',
  '/api/organization/tags',
  '/api/auth/google/callback',
  '/api/auth/google/authorize',
  '/api/settings/captcha',
  '/api/license-validate',
];

export const redirectPaths = [
  '/dashboard',
  '/jobs',
  '/auth/signup',
  '/:orgName/apply-jobs',
];
