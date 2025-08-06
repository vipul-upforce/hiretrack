"use client";

import { useState, useEffect } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Save,
  Mail,
  FileText,
  Home,
  ChevronRight,
  Eye,
  Code,
  Send,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";
import Link from "next/link";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
  isCustom?: boolean;
}

// Updated with simple variables for email templates
const templateVariables = ["SenderName", "ReceiverName", "PortalName"];

// Sample custom templates that users can add
const sampleCustomTemplates = [
  {
    name: "Practical Task Assignment",
    subject: "Practical Task - {{PortalName}} Application Process",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    
    <p style="margin: 0 0 15px 0;">Thank you for your interest in joining our team at {{PortalName}}. We're excited to move forward with your application!</p>
    
    <p style="margin: 0 0 15px 0;">As the next step in our evaluation process, we'd like you to complete a practical task that will help us assess your skills and approach to problem-solving.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3 style="color: #007bff; margin-top: 0;">Task Instructions:</h3>
        <p style="margin: 10px 0;"><strong>Task:</strong> [Please describe the specific task here]</p>
        <p style="margin: 10px 0;"><strong>Duration:</strong> Please complete this within [X days/hours]</p>
        <p style="margin: 10px 0;"><strong>Submission:</strong> Please send your solution to this email by [specific date and time]</p>
        <p style="margin: 10px 0;"><strong>Requirements:</strong> [List any specific requirements or technologies to use]</p>
    </div>
    
    <p style="margin: 15px 0;">If you have any questions about the task or need clarification, please don't hesitate to reach out to me directly.</p>
    
    <p style="margin: 15px 0;">We appreciate the time you're investing in this process and look forward to reviewing your work!</p>
    
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}} Team</p>
</div>`,
  },
  {
    name: "Interview Availability Check",
    subject: "Interview Scheduling - {{PortalName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    
    <p style="margin: 0 0 15px 0;">Congratulations! We'd like to invite you for an interview for the position you applied for at {{PortalName}}.</p>
    
    <p style="margin: 0 0 15px 0;">We're impressed with your background and would love to learn more about you and discuss how you could contribute to our team.</p>
    
    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3 style="color: #007bff; margin-top: 0;">Interview Details:</h3>
        <p style="margin: 10px 0;"><strong>Type:</strong> [Video Call / In-Person / Phone]</p>
        <p style="margin: 10px 0;"><strong>Duration:</strong> Approximately [30-60] minutes</p>
        <p style="margin: 10px 0;"><strong>Interview Panel:</strong> [Names and roles of interviewers]</p>
    </div>
    
    <p style="margin: 15px 0;"><strong>Please let us know your availability for the following time slots:</strong></p>
    
    <ul style="margin: 15px 0; padding-left: 25px;">
        <li style="margin: 5px 0;">[Day], [Date] at [Time] - [Time]</li>
        <li style="margin: 5px 0;">[Day], [Date] at [Time] - [Time]</li>
        <li style="margin: 5px 0;">[Day], [Date] at [Time] - [Time]</li>
    </ul>
    
    <p style="margin: 15px 0;">If none of these slots work for you, please suggest alternative times that suit your schedule.</p>
    
    <p style="margin: 15px 0;">Please confirm your attendance by replying to this email by [deadline date].</p>
    
    <p style="margin: 15px 0 0 0;">Looking forward to speaking with you soon!<br><br>Best regards,<br>{{SenderName}}<br>{{PortalName}} Team</p>
</div>`,
  },
  {
    name: "Follow-up After Interview",
    subject: "Thank you for the interview - {{PortalName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    
    <p style="margin: 0 0 15px 0;">Thank you for taking the time to interview with us at {{PortalName}}. It was a pleasure speaking with you about the [position name] role.</p>
    
    <p style="margin: 0 0 15px 0;">We were impressed by [specific positive feedback about the candidate - skills, experience, responses, etc.].</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3 style="color: #28a745; margin-top: 0;">Next Steps:</h3>
        <p style="margin: 10px 0;">We are currently reviewing all candidates and will be making our decision within the next [timeframe].</p>
        <p style="margin: 10px 0;">We will contact you by [specific date] with an update on your application status.</p>
    </div>
    
    <p style="margin: 15px 0;">In the meantime, if you have any questions about the role, our company, or the process, please don't hesitate to reach out.</p>
    
    <p style="margin: 15px 0;">Thank you again for your interest in {{PortalName}} and for the time you invested in our interview process.</p>
    
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}} Team</p>
</div>`,
  },
  {
    name: "Application Status Follow-up",
    subject: "Application Update - {{PortalName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    
    <p style="margin: 0 0 15px 0;">I hope this email finds you well. I wanted to provide you with an update on your application for the [position name] role at {{PortalName}}.</p>
    
    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3 style="color: #856404; margin-top: 0;">Current Status:</h3>
        <p style="margin: 10px 0;">[Provide specific status update - under review, moved to next round, pending final decision, etc.]</p>
    </div>
    
    <p style="margin: 15px 0;"><strong>What happens next:</strong></p>
    <p style="margin: 0 0 15px 0;">[Explain the next steps in the process, timeline, what they can expect]</p>
    
    <p style="margin: 15px 0;">We appreciate your patience during our evaluation process and your continued interest in joining our team.</p>
    
    <p style="margin: 15px 0;">If you have any questions or concerns, please feel free to reach out to me directly.</p>
    
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}} Team</p>
</div>`,
  },
  {
    name: "Reference Check Request",
    subject: "Reference Check - {{PortalName}} Application",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    
    <p style="margin: 0 0 15px 0;">We're making excellent progress with your application for the [position name] role at {{PortalName}}.</p>
    
    <p style="margin: 0 0 15px 0;">As part of our final evaluation process, we would like to conduct reference checks with your previous supervisors or colleagues.</p>
    
    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3 style="color: #007bff; margin-top: 0;">What We Need:</h3>
        <p style="margin: 10px 0;">Please provide contact information for 2-3 professional references who can speak to your:</p>
        <ul style="margin: 10px 0; padding-left: 25px;">
            <li style="margin: 5px 0;">Work performance and capabilities</li>
            <li style="margin: 5px 0;">Professional relationships and teamwork</li>
            <li style="margin: 5px 0;">Overall character and work ethic</li>
        </ul>
    </div>
    
    <p style="margin: 15px 0;"><strong>For each reference, please provide:</strong></p>
    <ul style="margin: 15px 0; padding-left: 25px;">
        <li style="margin: 5px 0;">Full name and job title</li>
        <li style="margin: 5px 0;">Company/organization name</li>
        <li style="margin: 5px 0;">Phone number and email address</li>
        <li style="margin: 5px 0;">Your working relationship and duration</li>
    </ul>
    
    <p style="margin: 15px 0;">Please send this information back to us within [timeframe] so we can proceed with the final steps.</p>
    
    <p style="margin: 15px 0 0 0;">Thank you for your cooperation!<br><br>Best regards,<br>{{SenderName}}<br>{{PortalName}} Team</p>
</div>`,
  },
  {
    name: "Welcome and Onboarding",
    subject: "Welcome to {{PortalName}} - Next Steps",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #28a745; margin-top: 0;">Congratulations {{ReceiverName}}!</h2>
    
    <p style="margin: 0 0 15px 0;">We are thrilled to welcome you to the {{PortalName}} team! After careful consideration, we're excited to offer you the [position name] role.</p>
    
    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3 style="color: #155724; margin-top: 0;">What's Next:</h3>
        <p style="margin: 10px 0;">We'll be sending you the official offer letter and employment contract within the next [timeframe].</p>
        <p style="margin: 10px 0;"><strong>Start Date:</strong> [Proposed start date]</p>
        <p style="margin: 10px 0;"><strong>Onboarding:</strong> We'll schedule your onboarding sessions and introduce you to the team.</p>
    </div>
    
    <p style="margin: 15px 0;"><strong>Before your start date, please prepare:</strong></p>
    <ul style="margin: 15px 0; padding-left: 25px;">
        <li style="margin: 5px 0;">Required documentation for HR</li>
        <li style="margin: 5px 0;">Banking details for payroll setup</li>
        <li style="margin: 5px 0;">Emergency contact information</li>
        <li style="margin: 5px 0;">Any questions about your role or the company</li>
    </ul>
    
    <p style="margin: 15px 0;">We're confident that you'll be a valuable addition to our team and look forward to the contributions you'll make.</p>
    
    <p style="margin: 15px 0;">Welcome aboard!</p>
    
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}} Team</p>
</div>`,
  },
];

const defaultTemplates: EmailTemplate[] = [
  {
    id: "job-application-hr",
    name: "Job Application (HR Notification)",
    subject: "New Job Application - {{jobTitle}}",
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
      "jobTitle",
      "candidateName",
      "candidateEmail",
      "candidatePhone",
      "applicationDate",
      "dashboardLink",
    ],
  },
  {
    id: "password-reset",
    name: "Password Reset Request",
    subject: "Password Reset Request - {{organizationName}}",
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
    variables: ["userName", "organizationName", "resetLink"],
  },
  {
    id: "interview-assignment",
    name: "Interview Assignment Event",
    subject: "Interview Assigned - {{candidateName}} for {{jobTitle}}",
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
            <p style="margin: 5px 0;"><strong>Time:</strong> {{interviewTime}}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> {{duration}}</p>
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
      "interviewerName",
      "candidateName",
      "jobTitle",
      "interviewDate",
      "interviewTime",
      "duration",
      "interviewType",
      "meetingLink",
      "candidateProfileLink",
      "dashboardLink",
      "organizationName",
    ],
  },
  {
    id: "status-update",
    name: "Status Update Notification",
    subject: "Application Status Update - {{jobTitle}}",
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
      "candidateName",
      "jobTitle",
      "organizationName",
      "newStatus",
      "statusMessage",
      "nextSteps",
      "hrContactInfo",
    ],
  },
  {
    id: "new-remark",
    name: "New Remark Added",
    subject: "New Feedback Added - {{candidateName}}",
    isDefault: true,
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">New Feedback Added</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>

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
</div>`,
    variables: [
      "recipientName",
      "candidateName",
      "jobTitle",
      "reviewerName",
      "remarkDate",
      "rating",
      "remarkText",
      "candidateProfileLink",
      "organizationName",
    ],
  },
  {
    id: "step-completed",
    name: "Step Completed",
    subject: "Interview Step Completed - {{candidateName}}",
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
      "recipientName",
      "candidateName",
      "jobTitle",
      "stepName",
      "completedBy",
      "completionDate",
      "feedback",
      "nextStep",
      "candidateProfileLink",
      "organizationName",
    ],
  },
  {
    id: "send-otp",
    name: "Send OTP",
    subject: "Your OTP Code - {{organizationName}}",
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
                <li style="margin: 5px 0;">This OTP is valid for {{expirationTime}} minutes only</li>
                <li style="margin: 5px 0;">Do not share this code with anyone</li>
                <li style="margin: 5px 0;">If you didn't request this OTP, please ignore this email</li>
            </ul>
        </div>

        <p style="margin: 15px 0;">If you're having trouble accessing your account, please contact our support team.</p>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Security Team</p>
    </div>
</div>`,
    variables: ["userName", "organizationName", "otpCode", "expirationTime"],
  },
];

export default function EmailTemplatesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    ...defaultTemplates,
  ]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<string>("job-application-hr");
  const [previewMode, setPreviewMode] = useState(false);

  // Custom template management
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [newTemplatePreviewMode, setNewTemplatePreviewMode] = useState(false);
  const [newTemplateEditor, setNewTemplateEditor] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    <p style="margin: 0 0 15px 0;">This is a custom email template.</p>
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}}</p>
</div>`,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);
  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/settings/templates");
      if (response.ok) {
        // debugger;
        const data = await response.json();
        if (data.templates && Object.keys(data.templates).length > 0) {
          // Convert API response back to our template format
          const loadedTemplates = Object.values(data.templates).map(
            (template: any) => ({
              id: template.templateId,
              name: template.templateName,
              subject: template.subject,
              content: template.html,
              variables: template.variables || defaultTemplates.find(
                (t) => t.id === template.templateId
              )?.variables || templateVariables,
              isCustom: !defaultTemplates.find(
                (t) => t.id === template.templateId
              ),
              isDefault: defaultTemplates.find(
                (t) => t.id === template.templateId
              )
                ? true
                : false,
            })
          );

          // Merge with default templates (in case some defaults aren't saved yet)
          const mergedTemplates = [...defaultTemplates];
          loadedTemplates.forEach((loaded: EmailTemplate) => {
            const existingIndex = mergedTemplates.findIndex(
              (t) => t.id === loaded.id
            );
            if (existingIndex >= 0) {
              mergedTemplates[existingIndex] = loaded;
            } else {
              mergedTemplates.push(loaded);
            }
          });

          setTemplates(mergedTemplates);
        } else {
          setTemplates([...defaultTemplates]);
        }
      }
    } catch (error) {
      console.error("Failed to load email templates:", error);
      setTemplates([...defaultTemplates]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const template of templates) {
        if (!template.subject.trim() || !template.content.trim()) {
          toast.error(
            `Template "${template.name}" has empty subject or content`
          );
          return;
        }
      }
      // Transform templates to match API expected format
      const templatesPayload = {};
      templates.forEach((template, index) => {
        templatesPayload[template.id] = {
          templateId: template.id,
          templateName: template.name,
          subject: template.subject,
          html: template.content,
          variables: template.variables, // Include variables
        };
      });

      const response = await fetch("/api/settings/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templatesPayload),
      });

      if (response.ok) {
        toast.success("Email templates saved successfully");
        // Refresh templates to get updated data
        await fetchTemplates();
      } else {
        toast.error("Failed to save email templates");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (
    id: string,
    field: keyof EmailTemplate,
    value: string
  ) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === id ? { ...template, [field]: value } : template
      )
    );
  };

  const resetToDefault = (id: string) => {
    const defaultTemplate = defaultTemplates.find((t) => t.id === id);
    if (defaultTemplate) {
      // Create a deep copy of the default template
      const resetTemplate = JSON.parse(JSON.stringify(defaultTemplate));
      setTemplates((prev) =>
        prev.map((template) => (template.id === id ? resetTemplate : template))
      );
      toast.success("Template reset to default");
    } else {
      toast.error("Default template not found");
    }
  };

  const insertVariableInNewTemplate = (variable: string) => {
    const variableText = `{{${variable}}}`;

    if (newTemplateEditor && !newTemplatePreviewMode) {
      // Get current cursor position
      const position = newTemplateEditor.getPosition();
      const model = newTemplateEditor.getModel();

      if (position && model) {
        // Insert the variable at cursor position
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        newTemplateEditor.executeEdits("insert-variable", [
          {
            range: range,
            text: variableText,
          },
        ]);

        // Update the template content state
        setNewTemplate((prev) => ({ ...prev, content: model.getValue() }));

        // Focus back to editor and position cursor after inserted text
        newTemplateEditor.focus();
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + variableText.length,
        };
        newTemplateEditor.setPosition(newPosition);
      }
    } else {
      // Fallback: append to end of content if editor not available or in preview mode
      setNewTemplate((prev) => ({
        ...prev,
        content: prev.content + variableText,
      }));
    }

    toast.success(`Variable {{${variable}}} inserted`);
  };

  const addCustomTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim()) {
      toast.error("Please fill in template name and subject");
      return;
    }
    // Validate variables in content
    // const usedVariables =
    //   newTemplate.content.match(/{{(\w+)}}/g)?.map((v) => v.slice(2, -2)) || [];
    // const invalidVariables = usedVariables.filter(
    //   (v) => !templateVariables.includes(v)
    // );
    // if (invalidVariables.length > 0) {
    //   toast.error(
    //     `Invalid variables used: ${invalidVariables.join(", ")}. Only ${templateVariables.join(", ")} are allowed.`
    //   );
    //   return;
    // }
    const templateId = `custom-${Date.now()}`;
    const customTemplate: EmailTemplate = {
      id: templateId,
      name: newTemplate.name.trim(),
      subject: newTemplate.subject.trim(),
      content: newTemplate.content,
      variables: templateVariables,
      isCustom: true,
      isDefault: true,
    };

    setTemplates((prev) => [...prev, customTemplate]);
    setSelectedTemplate(templateId);
    setNewTemplate({
      name: "",
      subject: "",
      content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    <p style="margin: 0 0 15px 0;">This is a custom email template.</p>
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}}</p>
</div>`,
    });
    setNewTemplatePreviewMode(false);
    setNewTemplateEditor(null);
    setShowAddDialog(false);
    toast.success("Custom template added successfully");
  };

  const deleteCustomTemplate = () => {
    if (!templateToDelete) return;

    const template = templates.find((t) => t.id === templateToDelete);
    if (template?.isDefault) {
      toast.error("Cannot delete default templates");
      return;
    }

    setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete));

    // If we're deleting the currently selected template, switch to the first one
    if (selectedTemplate === templateToDelete) {
      const remainingTemplates = templates.filter(
        (t) => t.id !== templateToDelete
      );
      setSelectedTemplate(remainingTemplates[0]?.id || "job-application-hr");
    }

    setTemplateToDelete(null);
    setShowDeleteDialog(false);
    toast.success("Custom template deleted successfully");
  };

  const getCurrentTemplate = () => {
    // debugger;
    const current = templates.find((t) => t.id === selectedTemplate);
    if (!current && templates.length > 0) {
      return templates[0];
    }
    return current || defaultTemplates[0];
  };

  const renderPreview = (content: string, variables: string[]) => {
    // Replace variables with sample data for preview
    const sampleData = {
      // New simplified variables
      SenderName: "Jane Smith (HR Manager)",
      ReceiverName: "John Doe",
      PortalName: "Acme Corporation",

      // Keep existing variables for backward compatibility with default templates
      organizationName: "Acme Corporation",
      candidateName: "John Doe",
      candidateEmail: "john.doe@email.com",
      candidatePhone: "+1 (555) 123-4567",
      jobTitle: "Senior Frontend Developer",
      applicationDate: "January 15, 2024",
      dashboardLink: "https://app.company.com/dashboard",
      userName: "John Doe",
      resetLink: "https://app.company.com/reset-password?token=abc123",
      interviewerName: "Jane Smith",
      interviewDate: "January 22, 2024",
      interviewTime: "2:00 PM",
      duration: "45 minutes",
      interviewType: "Technical Interview",
      meetingLink: "https://meet.company.com/interview-123",
      candidateProfileLink: "https://app.company.com/candidates/123",
      newStatus: "Interview Scheduled",
      statusMessage: "Your interview has been scheduled for next week.",
      nextSteps:
        "Please prepare for the technical interview and review the job requirements.",
      hrContactInfo: "hr@company.com | +1 (555) 987-6543",
      recipientName: "Jane Smith",
      reviewerName: "Mike Johnson",
      remarkDate: "January 20, 2024",
      rating: "4",
      remarkText:
        "Strong technical skills demonstrated during the initial screening. Good communication abilities.",
      stepName: "Technical Interview",
      completedBy: "Jane Smith",
      completionDate: "January 20, 2024",
      feedback:
        "Candidate showed excellent problem-solving skills and technical knowledge.",
      nextStep: "Final Interview with Hiring Manager",
      otpCode: "123456",
      expirationTime: "15",
    };
    // Check for missing variables
    const missingVariables = variables.filter(
      (variable) => !(variable in sampleData)
    );
    if (missingVariables.length > 0) {
      toast.warning(
        `Missing sample data for variables: ${missingVariables.join(", ")}`
      );
    }

    let previewContent = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      previewContent = previewContent.replace(
        new RegExp(`{{${key}}}`, "g"),
        value
      );
    });

    return previewContent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading email templates...</p>
        </div>
      </div>
    );
  }

  const currentTemplate = getCurrentTemplate();
  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design and breadcrumbs */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title and Breadcrumbs */}
            <div className="flex flex-col gap-2">
              {/* Breadcrumbs */}
              <nav className="flex items-center text-sm text-muted-foreground font-medium">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <Link
                  href="/dashboard/settings"
                  className="hover:text-foreground transition-colors"
                >
                  Settings
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-foreground font-semibold">
                  Email Templates
                </span>
              </nav>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Template Selection Dropdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Email Templates</h2>
                <p className="text-sm text-muted-foreground">
                  Select a template to customize
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom
              </Button>
            </div>

            <div className="max-w-md">
              <Label htmlFor="template-select" className="text-sm font-medium">
                Template
              </Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="h-[60px] mt-2">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {templates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      className="py-3"
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="font-medium">{template.name}</span>
                          <div className="flex gap-1">
                            {template.isDefault && (
                              <Badge variant="outline" className="text-xs">
                                Default
                              </Badge>
                            )}
                            {template.isCustom && (
                              <Badge variant="secondary" className="text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {template.subject}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delete button for custom templates */}
            {selectedTemplate &&
              templates.find((t) => t.id === selectedTemplate)?.isCustom && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTemplateToDelete(selectedTemplate);
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Template
                  </Button>
                </div>
              )}
          </div>

          {/* Editor Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      {currentTemplate.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      {currentTemplate.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetToDefault(currentTemplate.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset to Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMode(!previewMode)}
                      >
                        {previewMode ? (
                          <Code className="h-4 w-4 mr-2" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        {previewMode ? "Edit" : "Preview"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subject Line */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={currentTemplate.subject}
                      onChange={(e) =>
                        updateTemplate(
                          currentTemplate.id,
                          "subject",
                          e.target.value
                        )
                      }
                      placeholder="Email subject line"
                    />
                  </div>

                  {/* Content Editor */}
                  <div className="space-y-2">
                    <Label>Email Content</Label>
                    {previewMode ? (
                      <div className="border rounded-lg p-4 min-h-[400px] bg-white">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderPreview(
                              currentTemplate.content,
                              currentTemplate.variables
                            ),
                          }}
                        />
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Editor
                          height="400px"
                          language="html"
                          theme={theme === "dark" ? "vs-dark" : "vs"}
                          value={currentTemplate.content}
                          onChange={(value) =>
                            updateTemplate(
                              currentTemplate.id,
                              "content",
                              value || ""
                            )
                          }
                          options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: "on",
                            lineNumbers: "on",
                            folding: true,
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Available Variables
                  </CardTitle>
                  <CardDescription>
                    Use these variables in your template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Show simplified variables for custom templates, existing variables for default templates */}
                    {(currentTemplate.isCustom
                      ? templateVariables
                      : currentTemplate.variables
                    ).map((variable) => (
                      <div
                        key={variable}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <code className="font-mono">{`{{${variable}}}`}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${variable}}}`);
                            toast.success("Variable copied to clipboard");
                          }}
                          className="h-6 px-2"
                        >
                          Copy
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Template Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium">Template Usage</div>
                    <div className="text-muted-foreground mt-1">
                      {currentTemplate.isDefault
                        ? "This template is automatically sent when candidates apply for positions."
                        : "This is a custom template for manual emails to candidates."}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Styling Guidelines</div>
                    <div className="text-muted-foreground mt-1">
                      Use inline CSS styles for maximum email client
                      compatibility. Avoid external stylesheets or CSS
                      variables.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Template Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="!max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[80vw] lg:!min-w-[900px] lg:!h-[90vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[70vw] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pr-12 border-b border-gray-200 dark:border-gray-700 pb-4">
            <DialogTitle className="text-xl font-semibold">
              Add Custom Email Template
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Create a new custom email template with SenderName, ReceiverName,
              and PortalName variables.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side - Template Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Start with Sample Templates */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Start</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const sampleTemplate = sampleCustomTemplates.find(
                        (t) => t.name === value
                      );
                      if (sampleTemplate) {
                        setNewTemplate({
                          name: sampleTemplate.name,
                          subject: sampleTemplate.subject,
                          content: sampleTemplate.content,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose from sample templates or start from scratch" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {sampleCustomTemplates.map((sample) => (
                        <SelectItem
                          key={sample.name}
                          value={sample.name}
                          className="py-3"
                        >
                          <div className="flex flex-col w-full">
                            <span className="font-medium">{sample.name}</span>
                            <p className="text-xs text-gray-500 mt-1">
                              {sample.subject}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a pre-made template to customize, or continue with a
                    blank template below.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="template-name"
                    className="text-sm font-medium"
                  >
                    Template Name
                  </Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter template name"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="template-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </Label>
                  <Input
                    id="template-subject"
                    value={newTemplate.subject}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Enter email subject"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Content</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewTemplatePreviewMode(!newTemplatePreviewMode)
                      }
                    >
                      {newTemplatePreviewMode ? (
                        <>
                          <Code className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>

                  {newTemplatePreviewMode ? (
                    <div className="border rounded-lg p-4 min-h-[500px] bg-white overflow-auto">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderPreview(
                            newTemplate.content,
                            currentTemplate.variables
                          ),
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Editor
                        height="500px"
                        language="html"
                        theme={theme === "dark" ? "vs-dark" : "vs"}
                        value={newTemplate.content}
                        onChange={(value) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            content: value || "",
                          }))
                        }
                        onMount={(editor) => setNewTemplateEditor(editor)}
                        options={{
                          fontSize: 14,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          lineNumbers: "on",
                          folding: true,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Variables Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Available Variables
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Click to insert at cursor position
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {templateVariables.map((variable) => (
                        <div
                          key={variable}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => insertVariableInNewTemplate(variable)}
                        >
                          <div className="flex flex-col">
                            <code className="font-mono text-sm font-medium">{`{{${variable}}}`}</code>
                            <span className="text-xs text-muted-foreground mt-1">
                              {variable === "SenderName" &&
                                "Person sending the email"}
                              {variable === "ReceiverName" &&
                                "Candidate receiving the email"}
                              {variable === "PortalName" &&
                                "Your organization name"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertVariableInNewTemplate(variable);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" />
                      Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium">Variable Usage</div>
                      <div className="text-muted-foreground mt-1">
                        Variables will be automatically replaced when sending
                        emails.
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Styling Guidelines</div>
                      <div className="text-muted-foreground mt-1">
                        Use inline CSS styles for maximum email client
                        compatibility.
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Preview</div>
                      <div className="text-muted-foreground mt-1">
                        Use the Preview button to see how your template will
                        look to recipients.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3 bg-background px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addCustomTemplate}>Add Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom template? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCustomTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
