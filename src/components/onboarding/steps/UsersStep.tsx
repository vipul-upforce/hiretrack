'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function UsersStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  useEffect(() => {
    validateStep('users').then(setIsConfigured);
  }, [validateStep]);

  // Re-validate when user returns to the page (e.g., after navigating to users page)
  useEffect(() => {
    const handleFocus = () => {
      // Force refresh validation when page regains focus
      invalidateStepCache('users');
      validateStep('users', true).then(setIsConfigured);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [validateStep, invalidateStepCache]);

  const handleManageUsers = () => {
    // Navigate in the same tab instead of opening a new one
    window.location.href = '/dashboard/users';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30">
          <Users className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="mb-1 text-xl font-bold text-foreground">
            Add Team Members
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Invite HR team members and interviewers to your organization.
          </p>
        </div>
      </div>

      <Card
        className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}
      >
        <CardContent className="p-6">
          <Button
            variant="primary"
            onClick={handleManageUsers}
            className="flex items-center gap-2"
          >
            Manage Users
          </Button>

          {isConfigured && (
            <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Team members added!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UsersStep;
