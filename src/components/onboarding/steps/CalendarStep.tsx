'use client';

import React, { useState, useEffect } from 'react';
import GoogleCalendarSettings from '@/app/dashboard/settings/components/google-calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function CalendarStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  useEffect(() => {
    validateStep('calendar').then(setIsConfigured);
  }, [validateStep]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = async () => {
    setIsDialogOpen(false);
    // Re-validate the step after closing the dialog with force refresh
    // to ensure we get the latest configuration status
    invalidateStepCache('calendar');
    const isValid = await validateStep('calendar', true);
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30">
            <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-bold text-foreground">
              Google Calendar Integration
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Connect Google Calendar to schedule interviews directly.
            </p>
          </div>
        </div>

        <Card
          className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}
        >
          <CardContent className="p-6">
            <Button
              variant="primary"
              onClick={handleOpenDialog}
              className="flex items-center gap-2"
            >
              Connect Google Calendar
            </Button>

            {isConfigured && (
              <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Google Calendar connected!
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
            <DialogTitle>Google Calendar Integration</DialogTitle>
            <DialogDescription>
              Connect your Google Calendar to schedule interviews directly from
              the candidate assignment dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden overflow-y-auto px-6 py-0">
            <GoogleCalendarSettings onClose={handleCloseDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CalendarStep;
