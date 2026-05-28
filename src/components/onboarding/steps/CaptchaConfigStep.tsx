'use client';

import React, { useState, useEffect } from 'react';
import CaptchaSettings from '@/app/dashboard/settings/components/captcha';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function CaptchConfigStep(): React.ReactElement {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  useEffect(() => {
    validateStep('captcha').then(setIsConfigured);
  }, [validateStep]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = async () => {
    setIsDialogOpen(false);
    // Re-validate the step after closing the dialog with force refresh
    // to ensure we get the latest configuration status
    invalidateStepCache('captcha');
    const isValid = await validateStep('captcha', true);
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
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-bold text-foreground">
              Captcha Configuration
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Set up captcha protection to prevent bots and spam during user
              sign-ups.
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
              Configure Captcha
            </Button>

            {isConfigured && (
              <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Captcha configured!</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="overflow-hidden" size="xl">
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle>Captcha Configuration</DialogTitle>
            <DialogDescription>
              Set up captcha protection to prevent bots and spam during user
              sign-ups.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CaptchaSettings onClose={handleCloseDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CaptchConfigStep;
