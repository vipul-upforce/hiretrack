# HTML Email Templates

This document explains the HTML email templates currently in use across the system, including the dynamic variables they require.

---

## Template 1: Candidate Application Email

**Purpose:** Notifies the HR team and Candidate when a new job application is submitted by candidate.

### Dynamic Variables:

- `{{hrNotificationTitle}}` - Title of the notification (e.g., "New Job Application") this will be shown to both HR team and Candidates.
- `{{candidateName}}` - Full name of the candidate who submitted the application.
- `{{orgName}}` - Name of the organization receiving the application.
- `{{jobName}}` - Title of the job the candidate applied for.
- `{{email}}` - Candidate's email address.
- `{{status}}` - Current status of the application (e.g., "Submitted", "Under Review").
- `{{applicationDate}}` - Date when the application was submitted.

---

## Template 2: Event Scheduling Email

**Purpose:** Used to notify inteviewers of scheduled asssignments or meetings, with calendar integration links included.

### Dynamic Variables:

- `{{eventTitle}}` - Title of the event (e.g., "Interview Schedule").
- `{{startDate}}` - Date and time when the event is scheduled to start.
- `{{jobName}}` - Title of the job associated with the event.
- `{{interviewerName}}` - Name of the interviewer or meeting host.
- `{{candidateName}}` - Name of the candidate or participant.
- `{{status}}` - Status of the event (e.g., "Scheduled", "Confirmed").
- `{{googleCalendarLink}}` - Pre-generated URL to add the event to Google Calendar.
- `{{outlookCalendarLink}}` - Pre-generated URL to add the event to Outlook Calendar.

---

## Template 3: Remark Add Notification Email

**Purpose:** Used to notify HR and Admins when a new remark is added for a candidate, including the remark details and rating.

### Dynamic Variables:

- `{{remark_adder}}` - Name of the user who added the remark
- `{{remark_for}}` - Name of the candidate the remark is about
- `{{remark}}` - The actual remark/comment text
- `{{rating}}` - The rating given along with the remark

---

## Template 4: Password Reset Email

**Purpose:** Sends a secured password reset link to users who request to reset their account credentials.

### Dynamic Variables:

- `{{resetUrl}}` - Secure URL for resetting the user's password. This link is time-sensitive and expires in 1 hour.

---

## Template 5: Marked-as-Done Event

**Purpose:** Used to notify HR and Admins when a candidate's interview process is marked as completed by an interviewer.

### Dynamic Variables:

- `{{candidate_name}}` - Name of the candidate who was marked as done
- `{{unassigner}}` - Name of the user who marked the candidate as done

---

## Template 6: Candidate Status Update

**Purpose:** Used to notify HR and Admins when a candidate's status is updated in the system (e.g., from "Scheduled" to "Selected" or "Rejected").

### Dynamic Variables:

- `{{eventTitle}}` - Title of the status update event
- `{{eventSubTitle}}` - Shows either "Status updated from [previous status] to [new status] for candidate [name]" or "Status updated to [status] for candidate [name]" with highlighted values
- `{{actionBy}}` - Name of the user who performed the status update
- `{{status}}` - Current status of the candidate
- `{{remark}}` - Remarks/comments provided during the status update
- `{{rating}}` - Rating given during the status update
