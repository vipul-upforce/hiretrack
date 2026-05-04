import type { EmailTemplate } from '../types';

export const defaultTemplates: EmailTemplate[] = [
  {
    id: 'job-application-hr',
    name: 'Job Application (HR Notification)',
    subject: 'New Application: {{candidateName}} | {{jobTitle}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
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
</div>`,
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
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
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
</div>`,
    variables: ['userName', 'organizationName', 'resetLink'],
  },
  {
    id: 'interview-assignment',
    name: 'Interview Assignment Event',
    subject:
      'Interview Assigned: {{candidateName}} | {{jobTitle}} | Assigned To: {{interviewerName}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
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
</div>`,
    variables: [
      'interviewerName',
      'candidateName',
      'jobTitle',
      'interviewDate',
      'interviewTime',
      'duration',
      'interviewType',
      'meetingLink',
      'candidateProfileLink',
      'dashboardLink',
      'organizationName',
    ],
  },
  {
    id: 'status-update',
    name: 'Status Update Notification',
    subject:
      'Status Update: {{candidateName}} | {{jobTitle}} | {{nextSteps}} ➜ {{newStatus}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
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
</div>`,
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
    subject:
      'New Remark Added for {{candidateName}} by {{reviewerName}} for {{jobTitle}} position',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">New Remark Added</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>

        <p style="margin: 0 0 15px 0;">New Remark has been added for candidate <strong>{{candidateName}}</strong> applying for the <strong>{{jobTitle}}</strong> position.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Remark Details</h3>
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
</div>`,
    variables: [
      'recipientName',
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
    subject:
      'Step Completed: {{candidateName}} | {{jobTitle}} | {{stepName}} by {{completedBy}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Interview Step Completed</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>

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
</div>`,
    variables: [
      'recipientName',
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
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
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
                <li style="margin: 5px 0;">This OTP is valid for 1 minutes only</li>
                <li style="margin: 5px 0;">Do not share this code with anyone</li>
                <li style="margin: 5px 0;">If you didn't request this OTP, please ignore this email</li>
            </ul>
        </div>

        <p style="margin: 15px 0;">If you're having trouble accessing your account, please contact our support team.</p>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Security Team</p>
    </div>
</div>`,
    variables: ['userName', 'organizationName', 'otpCode', 'expirationTime'],
  },
  {
    id: 'bulk-assign',
    name: 'Bulk Assign',
    subject:
      'Bulk Candidates Assigned: {{candidateCount}} candidates for {{jobTitle}} | Assigned To: {{interviewerName}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">Candidates Assigned</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>
        <p style="margin: 0 0 15px 0;">{{triggererName}} has assigned {{candidateCount}} candidate(s) to {{interviewerName}} for the <strong>{{jobTitle}}</strong> position.</p>
        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Assignment Details</h3>
            <p style="margin: 5px 0;"><strong>Interviewer:</strong> {{interviewerName}}</p>
            <p style="margin: 5px 0;"><strong>Position:</strong> {{jobTitle}}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {{interviewDate}}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> {{interviewType}}</p>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
                <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li style="margin: 5px 0;">Review the candidates' profiles and resumes</li>
                    <li style="margin: 5px 0;">Prepare interview questions</li>
                    <li style="margin: 5px 0;">Schedule and conduct interviews</li>
                    <li style="margin: 5px 0;">Submit feedback after each interview</li>
                </ul>
            </div>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
                <p style="margin: 0 0 10px 0;"><strong>Assigned Candidates:</strong></p>
                <div style="margin: 0;">{{candidateListHtml}}</div>
            </div>
        </div>
        <div style="text-align: center; margin: 20px 0;">
            <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Candidates</a>
        </div>
        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team</p>
    </div>
</div>`,
    variables: [
      'candidateCount',
      'triggererName',
      'jobTitle',
      'jobId',
      'interviewerName',
      'dashboardLink',
      'actionUrl',
      'organizationName',
      'recipientName',
      'candidateListHtml',
      'viewAllCandidatesLink',
      'candidateName',
      'interviewDate',
      //   'interviewTime',
      //   'duration',
      'interviewType',
      //   'meetingLink',
      //   'outlookCalendarLink',
      'candidateProfileLink',
    ],
  },
  {
    id: 'bulk-unassign',
    name: 'Bulk Unassign',
    subject:
      'Bulk Candidates Unassigned: {{candidateCount}} candidates | {{jobTitle}} by {{triggererName}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">Candidates Unassigned</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>
        <p style="margin: 0 0 15px 0;">{{triggererName}} has unassigned {{candidateCount}} candidate(s) from the <strong>{{jobTitle}}</strong> position.</p>
        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Unassignment Details</h3>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0; font-weight: bold; color: #856404;">{{stepName}}</p>
                <p style="margin: 5px 0 0 0;">Unassigned by: {{completedBy}}</p>
                <p style="margin: 5px 0 0 0;">Date: {{completionDate}}</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Feedback:</strong></p>
                <p style="margin: 0;">{{feedback}}</p>
            </div>
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
                <p style="margin: 0;"><strong>Next Step:</strong> {{nextStep}}</p>
            </div>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0 0 10px 0;"><strong>Unassigned Candidates:</strong></p>
                <div style="margin: 0;">{{candidateListHtml}}</div>
            </div>
        </div>
        <div style="text-align: center; margin: 20px 0;"><a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Candidates</a></div>
        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`,
    variables: [
      'candidateCount',
      'triggererName',
      'jobTitle',
      //   'jobId',
      'dashboardLink',
      'actionUrl',
      'organizationName',
      'recipientName',
      'candidateListHtml',
      'viewAllCandidatesLink',
      'candidateName',
      'stepName',
      'completedBy',
      'completionDate',
      'feedback',
      'nextStep',
      'candidateProfileLink',
    ],
  },
  {
    id: 'bulk-status-update',
    name: 'Bulk Status Update',
    subject:
      'Bulk Status Update: {{candidateCount}} candidates | {{jobTitle}} ➜ {{newStatus}}',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">Bulk Status Update</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>
        <p style="margin: 0 0 15px 0;">{{triggererName}} has updated the status of {{candidateCount}} candidate(s) to <strong>{{newStatus}}</strong> for the <strong>{{jobTitle}}</strong> position.</p>
        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Current Status</h3>
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0056b3;">{{newStatus}}</p>
            </div>
            <p style="margin: 15px 0 0 0;">{{statusMessage}}</p>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
                <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
                <p style="margin: 0;">{{nextSteps}}</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Candidates list:</strong></p>
                <div style="margin: 0;">{{candidateListHtml}}</div>
            </div>
        </div>
        <div style="text-align: center; margin: 20px 0;"><a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Candidates</a></div>
        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team<br>{{hrContactInfo}}</p>
    </div>
</div>`,
    variables: [
      'candidateCount',
      'newStatus',
      'triggererName',
      'jobTitle',
      //   'jobId',
      'dashboardLink',
      'actionUrl',
      'organizationName',
      'recipientName',
      'candidateListHtml',
      'viewAllCandidatesLink',
      'candidateName',
      'statusMessage',
      'nextSteps',
      'hrContactInfo',
    ],
  },
  {
    id: 'bulk-remark',
    name: 'Bulk Remark Added',
    subject:
      'Bulk Remark Added: {{candidateCount}} candidates by {{triggererName}} for {{jobTitle}} position',
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">Bulk Remark Added</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>
        <p style="margin: 0 0 15px 0;">{{reviewerName}} has added a remark to {{candidateCount}} candidate(s) for the <strong>{{jobTitle}}</strong> position.</p>
        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Remark Details</h3>
            <p style="margin: 5px 0;"><strong>Added by:</strong> {{reviewerName}}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {{remarkDate}}</p>
            <p style="margin: 5px 0;"><strong>Rating:</strong> {{rating}}</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Comments:</strong></p>
                <p style="margin: 0;">{{remarkText}}</p>
            </div>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0 0 10px 0;"><strong>Candidates list:</strong></p>
                <div style="margin: 0;">{{candidateListHtml}}</div>
            </div>
        </div>
        <div style="text-align: center; margin: 20px 0;"><a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Candidates</a></div>
        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team</p>
    </div>
</div>`,
    variables: [
      'candidateCount',
      'triggererName',
      'remarkText',
      'jobTitle',
      //   'jobId',
      'dashboardLink',
      'actionUrl',
      'organizationName',
      'recipientName',
      'candidateListHtml',
      'viewAllCandidatesLink',
      'candidateName',
      'reviewerName',
      'remarkDate',
      'rating',
      'candidateProfileLink',
    ],
  },
];
