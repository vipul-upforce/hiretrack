'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  Settings,
  Palette,
  Bot,
  Mail,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

const WelcomeStep: React.FC = () => {
  const features = [
    {
      icon: Palette,
      title: 'Portal Branding',
      description:
        'Customize your job application portal with your company branding',
    },
    {
      icon: ShieldCheck,
      title: 'Captcha Verification',
      description: 'Configure captcha for the portal',
    },
    {
      icon: Bot,
      title: 'AI-Powered Resume Processing',
      description:
        'Configure AI providers to automatically process and score resumes',
    },
    {
      icon: Mail,
      title: 'Email Notifications',
      description: 'Set up email delivery for candidate and team notifications',
    },
    {
      icon: Calendar,
      title: 'Interview Scheduling',
      description: 'Connect Google Calendar for seamless interview scheduling',
    },
    {
      icon: Clock,
      title: 'Timezone Settings',
      description:
        "Configure your organization's timezone for proper scheduling",
    },
    {
      icon: HardDrive,
      title: 'File Storage',
      description:
        'Configure cloud storage to manage resumes and media files securely',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Invite team members and set up user roles',
    },
    {
      icon: Palette,
      title: 'Custom Fields',
      description:
        'Create custom form fields for jobs, applications, and candidate data',
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto">
          <Settings className="w-6 h-6 text-white" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Let's Set Up Your Hiring Platform
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Essential configurations to get HireTrack ready. Skip any step and
            return later.
          </p>
        </div>
      </div>

      <Card className="border-2 border-dashed border-border/60 bg-muted/40 dark:bg-muted/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              What you'll configure:
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center border border-border/30">
                  <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg p-4 border border-blue-500/30 dark:border-blue-500/20">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mt-0.5 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Flexible Setup
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
              Skip any step that you don't need right now. You can always
              complete the setup later from the settings page or use the
              onboarding shortcut in the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeStep;
