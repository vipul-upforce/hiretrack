import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React from "react";

interface TermsAndConditionsDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onAccept?: (accepted: boolean) => void;
}

export function TermsAndConditionsDialog({
  open,
  onOpenChange,
  onAccept,
}: TermsAndConditionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Terms and Conditions
          </DialogTitle>
        </DialogHeader>
        {/* <div className="flex-1 p-4 rounded-md border overflow-y-auto">
          <div className="space-y-6 pr-4 text-sm leading-relaxed">
            <h3 className="text-lg font-semibold">1. Introduction</h3>
            <p>
              Welcome to <strong>Hire Track</strong>, our AI-powered 
              application. These Terms and Conditions govern your access to and
              use of the Hire Track platform, including features integrated with
              Google’s Gemini AI model.
            </p>
            <p>
              By accessing or using Hire Track, you agree to comply with these
              Terms. If you do not agree, please discontinue use of the service.
            </p>

            <h3 className="text-lg font-semibold">2. Key Features</h3>
            <p>
              Hire Track offers a wide range of tools to simplify and enhance
              resume creation:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Pre-designed, professionally styled resume templates.</li>
              <li>Form-based inputs for easy resume generation.</li>
              <li>
                Resume upload and automated parsing powered by Google’s Gemini
                AI model.
              </li>
              <li>
                AI-enhanced grammar, tone, and writing style customization —
                including <strong>Creative</strong>, <strong>Concise</strong>,
                and <strong>Descriptive</strong> styles.
              </li>
              <li>
                Automatic saving and retrieval of resumes via{" "}
                <strong>localStorage</strong>.
              </li>
              <li>Administrator access to add and manage templates.</li>
              <li>
                Full customization options for fonts, colors, and layout styles.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">
              3. Use of Google Gemini AI
            </h3>
            <p>
              Hire Track integrates Googles Gemini AI model to enhance user
              experience. By using AI-powered features, you acknowledge and
              agree that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Resume content may be processed by Gemini AI to offer
                suggestions, improvements, or summaries.
              </li>
              <li>
                AI outputs are generated automatically and may require user
                review and correction.
              </li>
              <li>
                Your use of Gemini AI features is subject to Google’s{" "}
                <a
                  href="https://policies.google.com/terms"
                  className="underline text-blue-600"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="underline text-blue-600"
                >
                  Privacy Policy
                </a>
                .
              </li>
              <li>
                Do not submit sensitive or confidential data within
                AI-interactive sections of the platform.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">4. User Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide accurate and truthful information in your resume.</li>
              <li>
                Review all AI-generated suggestions before finalizing your
                content.
              </li>
              <li>
                Do not use Hire Track for illegal, deceptive, or unauthorized
                purposes.
              </li>
              <li>Keep your login credentials safe and secure.</li>
            </ul>

            <h3 className="text-lg font-semibold">
              5. Privacy and Data Protection
            </h3>
            <p>
              Your privacy is important to us. By using Hire Track, you consent to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                The collection and processing of your personal and resume data
                in line with our Privacy Policy.
              </li>
              <li>
                Storage of data on secure servers or your browser’s
                localStorage.
              </li>
              <li>
                Use of your data by third-party AI services (such as Gemini AI)
                strictly for functionality enhancement.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">6. Intellectual Property</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                The Hire Track platform and its content are protected by copyright
                and intellectual property laws.
              </li>
              <li>
                You may not copy, modify, distribute, or reverse-engineer any
                part of the service.
              </li>
              <li>
                Do not remove any proprietary notices from the application.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">
              7. Limitation of Liability
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                We do not guarantee the accuracy or appropriateness of
                AI-generated content.
              </li>
              <li>
                We are not responsible for any errors or omissions in the
                resumes generated.
              </li>
              <li>
                We are not liable for outcomes resulting from use of the
                platform (e.g., job offers, rejections, etc.).
              </li>
            </ul>

            <h3 className="text-lg font-semibold">8. Changes to Terms</h3>
            <p>
              We may update these Terms from time to time. Any changes will be
              posted on this page. Continued use of Hire Track implies acceptance
              of updated terms.
            </p>

            <h3 className="text-lg font-semibold">9. Termination</h3>
            <p>
              We reserve the right to suspend or terminate access to Hire Track at
              our discretion, especially in cases of policy violations, misuse
              of AI tools, or behavior harmful to other users.
            </p>

            <h3 className="text-lg font-semibold">10. Governing Law</h3>
            <p>
              These Terms are governed by and construed under the laws of the
              jurisdiction in which Hire Track is registered, excluding conflict of
              law principles.
            </p>

            <h3 className="text-lg font-semibold">11. Contact Us</h3>
            <p>
              If you have any questions or concerns about these Terms, please
              contact us at{" "}
              <a
                href="mailto:support@quikcv.com"
                className="text-blue-600 underline"
              >
                support@quikcv.com
              </a>
              .
            </p>
          </div>
        </div> */}

        <div className="flex-1 p-4 rounded-md border overflow-y-auto">
          <div className="space-y-6 pr-4 text-sm leading-relaxed">
            <h3 className="text-lg font-semibold">1. Introduction</h3>
            <p>
              Welcome to <strong>Hire Track</strong>, our AI-powered hiring
              management platform. These Terms and Conditions govern your access
              to and use of the Hire Track platform, including features
              integrated with Google’s Gemini AI model.
            </p>
            <p>
              By accessing or using Hire Track, you agree to comply with these
              Terms. If you do not agree, please discontinue use of the service.
            </p>

            <h3 className="text-lg font-semibold">2. Key Features</h3>
            <p>
              Hire Track offers powerful tools to simplify and optimize the
              hiring process:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Customizable hiring pipelines (e.g., Application, Screening,
                Interview, Offer).
              </li>
              <li>
                Drag-and-drop interface for candidate tracking (Kanban view).
              </li>
              <li>
                Role-based access control for recruiters and hiring managers.
              </li>
              <li>Collaborative feedback and comments on candidates.</li>
              <li>
                Google Gemini AI integration for resume parsing and candidate
                insights.
              </li>
              <li>Integrated interview scheduling with calendar sync.</li>
              <li>Email templates and communication tracking.</li>
              <li>Custom job application forms and assessments.</li>
              <li>
                Analytics dashboard for hiring metrics (time-to-hire, source
                tracking, etc.).
              </li>
              <li>Branded career portal and job posting management.</li>
            </ul>

            <h3 className="text-lg font-semibold">
              3. Use of Google Gemini AI
            </h3>
            <p>
              Hire Track integrates Google’s Gemini AI model to enhance hiring
              workflows. By using AI-powered features, you acknowledge and agree
              that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Candidate data may be processed to provide summaries,
                suggestions, or ranking insights.
              </li>
              <li>
                AI outputs are automatically generated and should be reviewed by
                human users.
              </li>
              <li>
                Your use of Gemini AI features is subject to Google’s{" "}
                <a
                  href="https://policies.google.com/terms"
                  className="underline text-blue-600"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="underline text-blue-600"
                >
                  Privacy Policy
                </a>
                .
              </li>
              <li>
                Do not submit confidential or legally protected data through
                AI-interactive tools.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">4. User Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Ensure all job and candidate data entered is accurate and up to
                date.
              </li>
              <li>
                Use AI suggestions as support, not substitutes for human
                evaluation.
              </li>
              <li>Use the platform only for lawful hiring purposes.</li>
              <li>Protect login credentials and access permissions.</li>
            </ul>

            <h3 className="text-lg font-semibold">
              5. Privacy and Data Protection
            </h3>
            <p>
              Your privacy is important to us. By using Hire Track, you consent
              to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                The collection and use of candidate and recruiter data as
                described in our Privacy Policy.
              </li>
              <li>
                Data storage on secure servers and/or localStorage as required
                for functionality.
              </li>
              <li>
                Third-party AI tools using data strictly to enhance core
                features (e.g., parsing, feedback suggestions).
              </li>
            </ul>

            <h3 className="text-lg font-semibold">6. Intellectual Property</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                All platform components, designs, and data are protected by
                copyright and intellectual property laws.
              </li>
              <li>
                Reproduction or redistribution of any part of Hire Track is
                prohibited without permission.
              </li>
              <li>
                Do not remove or obscure any proprietary notices on the
                platform.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">
              7. Limitation of Liability
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                We do not guarantee the accuracy of AI-generated insights or
                assessments.
              </li>
              <li>
                Hire Track is not responsible for hiring decisions or candidate
                outcomes.
              </li>
              <li>
                We are not liable for losses arising from misuse of the platform
                or data errors.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">8. Changes to Terms</h3>
            <p>
              These Terms may be updated periodically. Continued use of the
              platform constitutes acceptance of any revised terms.
            </p>

            <h3 className="text-lg font-semibold">9. Termination</h3>
            <p>
              We reserve the right to terminate or suspend access to Hire Track
              for violations of our Terms, misuse of AI features, or harmful
              conduct.
            </p>

            <h3 className="text-lg font-semibold">10. Governing Law</h3>
            <p>
              These Terms are governed by the laws of the jurisdiction in which
              Hire Track is registered.
            </p>

            <h3 className="text-lg font-semibold">11. Contact Us</h3>
            <p>
              For questions or support, contact us at{" "}
              <a
                href="mailto:support@quikcv.com"
                className="text-blue-600 underline"
              >
                support@hiretrack.com
              </a>
              .
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onAccept?.(false)}
            className="sm:flex-1"
          >
            Decline
          </Button>
          <Button
            onClick={() => onAccept?.(true)}
            className="sm:flex-1"
          >
            Accept Terms & Conditions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
