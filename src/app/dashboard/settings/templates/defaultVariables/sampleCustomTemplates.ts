import type { SampleCustomTemplate } from '../types';

export const sampleCustomTemplates: SampleCustomTemplate[] = [
  {
    name: 'Practical Task Assignment',
    subject: 'Practical Task - {{PortalName}} Application Process',
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
    name: 'Interview Availability Check',
    subject: 'Interview Scheduling - {{PortalName}}',
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
    name: 'Follow-up After Interview',
    subject: 'Thank you for the interview - {{PortalName}}',
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
    name: 'Application Status Follow-up',
    subject: 'Application Update - {{PortalName}}',
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
    name: 'Reference Check Request',
    subject: 'Reference Check - {{PortalName}} Application',
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
    name: 'Welcome and Onboarding',
    subject: 'Welcome to {{PortalName}} - Next Steps',
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
