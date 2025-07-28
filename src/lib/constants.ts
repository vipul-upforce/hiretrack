import { IEmailTemplate } from "@/app/dashboard/settings/components/types";

export const jobD = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f5f5f5">
    <div
      style="
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      "
    >
      <div style="padding: 40px">
        <h2
          style="
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 24px;
            font-weight: 600;
          "
        >
          {{hrNotificationTitle}}
        </h2>

        <p
          style="
            color: #34495e;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
          "
        >
          {{candidateName}} has applied for a position at
          <strong style="color: #2c3e50">{{orgName}}</strong>.
        </p>

        <div
          style="background-color: #f8f9fa; padding: 20px; border-radius: 6px"
        >
          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
              font-weight: 500;
            "
          >
            Application details:
          </p>

          <div style="border-top: 1px solid #e9ecef; padding-top: 15px">
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Job Title:</strong><br />
              <span style="color: #7f8c8d">{{jobName}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Candidate Name:</strong><br />
              <a href="{{candidateDetails}}" style="color: #7f8c8d">{{candidateName}}</a>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Candidate Email:</strong><br />
              <span style="color: #7f8c8d">{{email}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Status:</strong><br />
              <span style="color: #7f8c8d">{{status}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Application Date:</strong><br />
              <span style="color: #7f8c8d">{{applicationDate}}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </body>
</html>`;

export const ResetP = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f5f5f5">
    <div
      style="
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      "
    >
      <div style="padding: 40px">
        <h3
          style="
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 24px;
            font-weight: 600;
          "
        >
          Password Reset Request
        </h3>

        <div
          style="background-color: #f8f9fa; padding: 20px; border-radius: 6px"
        >
          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            Hello,
          </p>

          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            You requested to reset your password.
          </p>

          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            Click the button below to reset your password:
          </p>

          <div style="text-align: center; margin: 20px 0">
            <a
              href="{{resetUrl}}"
              style="
                display: inline-block;
                background-color: #4285f4;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 4px;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-weight: 500;
                transition: background-color 0.3s;
              "
              >Reset Password</a
            >
          </div>

          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            This link will expire in 1 hour.
          </p>

          <p
            style="
              color: #34495e;
              margin: 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </body>
</html>`;

export const assE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f5f5f5">
    <div
      style="
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      "
    >
      <div style="padding: 40px">
        <h2
          style="
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 24px;
            font-weight: 600;
          "
        >
          {{eventTitle}}
        </h2>

        <p
          style="
            color: #34495e;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
          "
        >
          Hi {{interviewerName}},<br />
          A new interview has been scheduled for you. Please find the details
          below:
        </p>

        <div
          style="
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
          "
        >
          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            <strong style="color: #2c3e50">Meeting time:</strong><br />
            <span style="color: #7f8c8d">{{startDate}}</span>
          </p>

          <div style="border-top: 1px solid #e9ecef; padding-top: 15px">
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Job Name:</strong><br />
              <span style="color: #7f8c8d">{{jobName}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Interviewer Name:</strong><br />
              <span style="color: #7f8c8d">{{interviewerName}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Candidate Name:</strong><br />
              <a href="{{candidateDetailsPage}}" style="color: #7f8c8d">{{candidateName}}</a>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Status:</strong><br />
              <span style="color: #7f8c8d">{{status}}</span>
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px">
          <p
            style="
              color: #34495e;
              margin: 0 0 20px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            Add this event to your calendar:
          </p>
          <a
            href="{{googleCalendarLink}}"
            target="_blank"
            style="
              display: inline-block;
              background-color: #4285f4;
              color: white;
              padding: 12px 24px;
              margin-right: 10px;
              text-decoration: none;
              border-radius: 4px;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-weight: 500;
              transition: background-color 0.3s;
            "
            >Google Calendar</a
          >
          <a
            href="{{outlookCalendarLink}}"
            target="_blank"
            style="
              display: inline-block;
              background-color: #0078d4;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-weight: 500;
              transition: background-color 0.3s;
            "
            >Outlook Calendar</a
          >
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </body>
</html>`;

export const StatusU = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f5f5f5">
    <div
      style="
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      "
    >
      <div style="padding: 40px">
        <h2
          style="
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 24px;
            font-weight: 600;
          "
        >
          {{eventTitle}}
        </h2>
        <a style="color: #2c3e50;
        margin: 0 0 20px 0;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 16px;" href="{{candidateDetails}}">View or Edit Candidate Details</a>

        <p
          style="
            color: #34495e;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
          "
        >
          {{eventSubTitle}}
          <span style="font-size: 14px; color: #7f8c8d;">Last updated by <strong>{{actionBy}}</strong></span>
        </p>

        <div
          style="
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
          "
        >
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Status:</strong><br />
              <span style="color: #7f8c8d">{{status}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Remarks:</strong><br />
              <span style="color: #7f8c8d">{{remark}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Rating:</strong><br />
              <span style="color: #7f8c8d">{{rating}}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </body>
</html>`;

export const RemA = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f5f5f5">
    <div
      style="
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      "
    >
      <div style="padding: 40px">
        <h3
          style="
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 24px;
            font-weight: 600;
          "
        >
          New Remark Added for {{remark_for}} - <a href="{{candidateDetails}}">View Profile</a>
        </h3>

        <div
          style="background-color: #f8f9fa; padding: 20px; border-radius: 6px"
        >
          <p
            style="
              color: #34495e;
              margin: 0 0 15px 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
            "
          >
            A new remark has been added by
            <span style="color: #7f8c8d">{{remark_adder}}</span>
          </p>

          <div style="border-top: 1px solid #e9ecef; padding-top: 15px">
            <p
              style="
                color: #34495e;
                margin: 0 0 10px 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Remark:</strong><br />
              <span style="color: #7f8c8d">{{remark}}</span>
            </p>
            <p
              style="
                color: #34495e;
                margin: 0;
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 16px;
              "
            >
              <strong style="color: #2c3e50">Rating:</strong><br />
              <span style="color: #7f8c8d">{{rating}}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </body>
</html>`;

export const MAD = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f5f5f5">
    <div
      style="
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      "
    >
      <div style="padding: 40px">
        <h3
          style="
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 24px;
            font-weight: 600;
          "
        >
          Step Completed By {{unassigner}}
        </h3>

        <div
          style="background-color: #f8f9fa; padding: 20px; border-radius: 6px"
        >
          <p
            style="
              color: #34495e;
              margin: 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
              line-height: 1.5;
            "
          >
            The previous step for candidate
            <a href="{{candidateDetails}}" style="color: #7f8c8d">{{candidate_name}}</a> has been
            completed by <span style="color: #7f8c8d">{{unassigner}}</span>.
            Proceed with the next steps.
          </p>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </body>
</html>`;

export const OTP = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication</title>
    <style>
        body {
            font-family: sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .content {
            padding: 20px 0;
        }
        .otp-code {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 5px;
            padding: 15px;
            background-color: #f0f0f0;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #888;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Two-Factor Authentication</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your one-time password (OTP) for logging in is:</p>
            <div class="otp-code">{{otp}}</div>
            <p>This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 HireTrack. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

export const Data = {
  orgName: "Acme Inc",
  candidateName: "John Doe",
  jobName: "Senior Developer",
  email: "john.doe@example.com",
  status: "Applied",
  applicationDate: "2024-01-15",
  hrNotificationTitle: "New Job Application Received",
  candidateDetails: "https://example.com/candidate/123",
  resetUrl: "https://example.com/reset?token=abc123",
  eventTitle: "Interview Scheduled",
  interviewerName: "Jane Smith",
  startDate: "2024-01-20 10:00 AM",
  candidateDetailsPage: "https://example.com/candidate/123",
  googleCalendarLink:
    "https://calendar.google.com/calendar/render?action=TEMPLATE",
  outlookCalendarLink: "https://outlook.live.com/calendar/0/deeplink/compose",
  eventSubTitle: "Status has been updated for this candidate",
  actionBy: "HR Manager",
  remark: "Great technical skills, good communication",
  rating: "4.5/5",
  remark_for: "John Doe",
  remark_adder: "Technical Lead",
  unassigner: "HR Manager",
  candidate_name: "John Doe",
  otp: "234533",
};

// Default templates based on your HTML files
export const defaultTemplates: { [key: string]: IEmailTemplate } = {
  "job-application-(hr)": {
    templateId: "job-application-(hr)",
    templateName: "Job Application (HR Notification)",
    subject: "New Job Application - {{candidateName}} for {{jobName}}",
    html: jobD,
    variables: [
      "orgName",
      "hrNotificationTitle",
      "status",
      "email",
      "candidateName",
      "jobName",
      "applicationDate",
      "candidateDetails",
    ],
  },
  "reset-password-request": {
    templateId: "reset-password-request",
    templateName: "Password Reset Request",
    subject: "Password Reset Request",
    html: ResetP,
    variables: ["resetUrl"],
  },
  "assignment-event": {
    templateId: "assignment-event",
    templateName: "Interview Assignment Event",
    subject: "Interview Scheduled - {{jobName}} with {{candidateName}}",
    html: assE,
    variables: [
      "eventTitle",
      "startDate",
      "endDate",
      "jobName",
      "interviewerName",
      "candidateName",
      "status",
      "googleCalendarLink",
      "outlookCalendarLink",
      "candidateDetailsPage",
    ],
  },
  "status-update": {
    templateId: "status-update",
    templateName: "Status Update Notification",
    subject: "Status Update - {{candidateName}}",
    html: StatusU,
    variables: [
      "eventTitle",
      "candidateName",
      "status",
      "remark",
      "rating",
      "actionBy",
      "prev_status",
      "eventSubTitle",
      "candidateDetails",
    ],
  },
  "remark-add": {
    templateId: "remark-add",
    templateName: "New Remark Added",
    subject: "New Remark Added for {{remark_for}}",
    html: RemA,
    variables: [
      "remark_adder",
      "remark_for",
      "rating",
      "remark",
      "candidateDetails",
    ],
  },
  "marked-as-done": {
    templateId: "marked-as-done",
    templateName: "Step Completed",
    subject: "Step Completed by {{unassigner}} for {{candidate_name}}",
    html: MAD,
    variables: ["candidate_name", "unassigner", "candidateDetails"],
  },
  "2fa-otp": {
    templateId: "2fa-otp",
    templateName: "Send OTP",
    subject: "OTP to login",
    html: OTP,
    variables: ["otp"],
  },
};

export const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: "on" as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: "on" as const,
  formatOnPaste: true,
  formatOnType: true,
};

export const wierdFileNamePattern = /[^a-zA-Z0-9(). ]/g;
// export const wierdFileNamePattern = /^(?!.*[()]{2,})[a-zA-Z0-9()]+$/g;


export const scoreColors: Record<number, { bg: string; text: string; border: string }> = {
  // Poor (1-2): Red theme
  1: {
    bg: "",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500 dark:border-red-400",
  },
  2: {
    bg: "",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500 dark:border-red-400",
  },
  // Below Average (3-4): Orange theme
  3: {
    bg: "",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500 dark:border-orange-400",
  },
  4: {
    bg: "",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500 dark:border-orange-400",
  },
  // Average (5): Purple theme
  5: {
    bg: "",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-500 dark:border-purple-400",
  },
  // Above Average (6): Indigo theme
  6: {
    bg: "",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500 dark:border-indigo-400",
  },
  // Good (7): Teal theme
  7: {
    bg: "",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-500 dark:border-teal-400",
  },
  // Very Good (8): Emerald theme
  8: {
    bg: "",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500 dark:border-emerald-400",
  },
  // Excellent (9-10): Green theme
  9: {
    bg: "",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-500 dark:border-green-400",
  },
  10: {
    bg: "",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-500 dark:border-green-400",
  },
};
