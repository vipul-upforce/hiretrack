'use client';

import React, { useState, useEffect } from 'react';
import SMTPConfigs from '@/app/dashboard/settings/components/mail-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Mail,
  Settings,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import logger from '@/lib/logger';
import { useOnboarding } from '../OnboardingProvider';

function EmailConfigStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  const checkConfiguration = async (forceRefresh = false) => {
    try {
      setIsChecking(true);
      // Invalidate cache before validating to ensure fresh data
      if (forceRefresh) {
        invalidateStepCache('email');
      }
      const isValid = await validateStep('email', forceRefresh);
      setIsConfigured(isValid);
    } catch (error) {
      logger.error('Error checking email configuration:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConfiguration();
  }, []);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = async () => {
    setIsDialogOpen(false);
    // Re-validate the step after closing the dialog with force refresh
    // to ensure we get the latest configuration status
    await checkConfiguration(true);
  };

  const handleDialogOpenChange = async (open: boolean) => {
    if (!open) {
      await handleCloseDialog();
    } else {
      setIsDialogOpen(true);
    }
  };

  const emailProviders = [
    { name: 'SMTP', description: 'Connect your existing email server' },
    {
      name: 'Resend',
      description: 'Modern email API with excellent deliverability',
    },
    { name: 'Brevo', description: 'All-in-one email marketing platform' },
  ];

  const emailTypes = [
    'Application confirmations',
    'Interview invitations',
    'Status update notifications',
    'Team assignment alerts',
  ];

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      );
    }
    return isConfigured ? (
      <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
    ) : (
      <XCircle className="h-5 w-5 text-muted-foreground" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
          <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>

        <div>
          <h2 className="mb-1 text-xl font-bold text-foreground">
            Email Configuration
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Configure automated notifications for candidates and team members.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card
        className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              Email Provider Status
              {getStatusIcon()}
            </CardTitle>
            <Badge
              variant={isConfigured ? 'default' : 'secondary'}
              className={
                isConfigured
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : ''
              }
            >
              {isConfigured ? 'Connected' : 'Not Set'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Available Providers */}
            <div>
              <h4 className="mb-3 font-medium text-foreground">
                Supported Email Providers:
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {emailProviders.map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-start space-x-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Mail className="mt-0.5 h-4 w-4 text-green-500 dark:text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {provider.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {provider.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                onClick={handleOpenDialog}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configure Email
              </Button>

              <Button
                variant="outline"
                onClick={() => checkConfiguration(true)}
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Refresh Status'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Types Card */}
      <Card className="border-blue-500/30 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-900/10">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Automated Email Types:
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {emailTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-200"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50/50 px-4 py-2 text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              Email provider connected!
            </span>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="hide-scrollbar flex max-h-[90vh] w-[60vw] flex-col overflow-y-auto p-0"
          size="xl"
        >
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle>Email Configuration</DialogTitle>
            <DialogDescription>
              Configure automated notifications for candidates and team members.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <SMTPConfigs onClose={handleCloseDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailConfigStep;
