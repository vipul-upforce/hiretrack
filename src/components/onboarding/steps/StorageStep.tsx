'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardDrive, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function StorageStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const { validateStep } = useOnboarding();

  useEffect(() => {
    validateStep('storage').then(setIsConfigured);
  }, [validateStep]);

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
          <HardDrive className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="mb-1 text-xl font-bold text-foreground">
            File Storage
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Configure cloud storage for resumes and attachments.
          </p>
        </div>
      </div>

      <Card
        className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}
      >
        <CardContent className="p-6">
          <Button
            variant="primary"
            onClick={() =>
              window.open('/dashboard/settings?config=fs', '_blank')
            }
            className="flex items-center gap-2"
          >
            Configure Storage
            <ExternalLink className="h-4 w-4" />
          </Button>

          {isConfigured && (
            <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                Cloud storage configured!
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StorageStep;
