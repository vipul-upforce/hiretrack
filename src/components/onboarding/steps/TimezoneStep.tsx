'use client';

import React, { useState, useEffect } from 'react';
import TimeZoneSelect from '@/app/dashboard/settings/components/time-zone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Clock, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function TimezoneStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  useEffect(() => {
    validateStep('timezone').then(setIsConfigured);
  }, [validateStep]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = async () => {
    setIsDialogOpen(false);
    // Re-validate the step after closing the dialog with force refresh
    // to ensure we get the latest configuration status
    invalidateStepCache('timezone');
    const isValid = await validateStep('timezone', true);
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-bold text-foreground">
              Timezone Configuration
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Set your organization&apos;s timezone for proper scheduling.
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
              Configure Timezone
            </Button>

            {isConfigured && (
              <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Timezone configured!
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          size="xl"
          className="w-[40vw] max-w-2xl overflow-visible"
        >
          <DialogHeader>
            <DialogTitle>Timezone Configuration</DialogTitle>
            <DialogDescription>
              Set your organization&apos;s timezone for proper scheduling and
              interview coordination.
            </DialogDescription>
          </DialogHeader>

          <TimeZoneSelect onClose={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TimezoneStep;
