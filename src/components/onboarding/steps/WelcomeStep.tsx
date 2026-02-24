'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  Settings,
  Palette,
  Bot,
  Mail,
  Video,
  Clock,
  Users,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

function WelcomeStep() {
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
      icon: Video,
      title: 'Meeting Integration',
      description:
        'Connect Google Meet, Zoom, or Microsoft Teams for video interviews',
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
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Settings className="h-6 w-6 text-white" />
        </div>

        <div>
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Let&apos;s Set Up Your Hiring Platform
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Essential configurations to get HireTrack ready. Skip any step and
            return later.
          </p>
        </div>
      </div>

      <Card className="border-2 border-dashed border-border/60 bg-muted/40 dark:bg-muted/20">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              What you&apos;ll configure:
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title + feature.description}
                className="flex items-start space-x-3 rounded-lg border border-border/50 bg-background p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/30 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="mb-1 font-medium text-foreground">
                    {feature.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-blue-500/30 bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-4 dark:border-blue-500/20 dark:from-blue-900/10 dark:to-purple-900/10">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-100 dark:border-blue-800 dark:bg-blue-900/40">
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="mb-1 font-medium text-blue-900 dark:text-blue-100">
              Flexible Setup
            </h4>
            <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
              Skip any step that you don&apos;t need right now. You can always
              complete the setup later from the settings page or use the
              onboarding shortcut in the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeStep;
