'use client';

import React, { useState, useEffect } from 'react';
import MeetingCommunicationSettings from '@/app/dashboard/settings/components/communication/meeting-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Video, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function MeetingIntegrationStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  useEffect(() => {
    validateStep('meetingIntegration').then(setIsConfigured);
  }, [validateStep]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = async () => {
    setIsDialogOpen(false);
    invalidateStepCache('meetingIntegration');
    const isValid = await validateStep('meetingIntegration', true);
    setIsConfigured(isValid);
  };

  const handleDialogOpenChange = async (open: boolean) => {
    if (!open) {
      await handleCloseDialog();
    } else {
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-bold text-foreground">
              Meeting Integration
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Connect Google Meet, Zoom, or Microsoft Teams for assignment-based interview scheduling and reminders.
            </p>
          </div>
        </div>

        <Card
          className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}
        >
          <CardContent className="p-6">
            <div className="mb-4 space-y-2 text-sm text-muted-foreground">
              <p>Choose from Google Meet, Zoom, or Microsoft Teams.</p>
              <p>
                One meeting provider is used per assignment, and Teams supports
                reminder templates and bot-driven notifications.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleOpenDialog}
              className="flex items-center gap-2"
            >
              Configure Meeting Integration
            </Button>

            {isConfigured && (
              <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Meeting integration configured!
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          size="2xl"
          className="flex max-h-[90vh] flex-col overflow-hidden p-0"
        >
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle>Meeting Integration</DialogTitle>
            <DialogDescription>
              Configure Google Meet, Zoom, or Microsoft Teams for assignment
              scheduling. One provider is used per assignment, and Teams can use
              template-based bot reminders and follow-up notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden overflow-y-auto px-6 py-0">
            <MeetingCommunicationSettings onClose={handleCloseDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MeetingIntegrationStep;
