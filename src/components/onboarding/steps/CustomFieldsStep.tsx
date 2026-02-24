'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import CustomFieldDialog from '@/Custom_Fields/Components/Common/CustomFieldDialog';
import Stepper from '@/Custom_Fields/Components/Stepper';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function CustomFieldsStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();
  const context = useContext(CustomFieldsContext);
  const setStepName = context?.setStepName || (() => {});

  useEffect(() => {
    validateStep('customFields').then(setIsConfigured);
  }, [validateStep]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = useCallback(async () => {
    setStepName('FormList');
    setIsDialogOpen(false);
    // Re-validate the step after closing the dialog with force refresh
    // to ensure we get the latest configuration status
    invalidateStepCache('customFields');
    const isValid = await validateStep('customFields', true);
    setIsConfigured(isValid);
  }, [setStepName, validateStep, invalidateStepCache]);

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30">
            <Palette className="h-6 w-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-bold text-foreground">
              Custom Fields
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Create custom form fields for jobs and candidate applications.
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
              Configure Custom Fields
            </Button>

            {isConfigured && (
              <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Custom fields created!
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomFieldDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title="Personalized form fields"
      >
        <Stepper />
      </CustomFieldDialog>
    </>
  );
}

export default CustomFieldsStep;
