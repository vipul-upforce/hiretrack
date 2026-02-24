'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  ChevronRight,
  X,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ConfirmationDialog from '@/app/dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog';
import { useOnboarding } from './OnboardingProvider';

interface OnboardingSidebarProps {
  isCollapsed: boolean;
}

function OnboardingSidebar({ isCollapsed }: OnboardingSidebarProps) {
  const { setIsOpen, progress, doNotShowAgain, onboardingStatus, isLoading } =
    useOnboarding();

  const [showDismissDialog, setShowDismissDialog] = useState(false);

  // TESTING MODE: Always show the sidebar
  if (isLoading || onboardingStatus?.doNotShowAgain) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDismissDialog(true); // Show the confirmation dialog
  };

  if (
    isLoading ||
    onboardingStatus?.doNotShowAgain ||
    (onboardingStatus?.isCompleted && progress?.percentage === 100)
  ) {
    return null;
  }

  const handleOpenOnboarding = () => {
    setIsOpen(true);
  };

  const progressPercentage = progress?.percentage || 0;
  const isComplete = progressPercentage === 100;

  if (isCollapsed) {
    // Collapsed sidebar view - just an icon button
    return (
      <div className="mb-2 px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenOnboarding}
          className={cn(
            'relative h-10 w-full rounded-lg transition-all duration-200',
            'hover:bg-blue-50 dark:hover:bg-blue-900/20',
          )}
          title={`Setup Progress: ${progressPercentage}%`}
        >
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Sparkles className="h-5 w-5 text-blue-500" />
          )}

          {!isComplete && (
            <div className="absolute -right-1 -top-1">
              <div className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500">
                <span className="text-[8px] font-bold text-white">
                  {Math.round(progressPercentage / 10)}
                </span>
              </div>
            </div>
          )}
        </Button>
      </div>
    );
  }

  // Expanded sidebar view - full card
  return (
    <div className="mb-3 mt-16 px-3">
      <Card
        className={cn(
          'cursor-pointer border-2 transition-all duration-200 hover:shadow-md',
          isComplete
            ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
            : 'border-portal-primary bg-[hsl(var(--portal-primary-h),var(--portal-primary-s),var(--portal-primary-l),0.12)] dark:bg-[hsl(var(--portal-primary-h),var(--portal-primary-s),var(--portal-primary-l),0.18)]',
        )}
      >
        <CardContent className="p-3">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Sparkles className="text-portal-primary h-4 w-4" />
                )}

                <span
                  className={cn(
                    'text-xs font-medium',
                    isComplete
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-portal-primary',
                  )}
                >
                  {isComplete ? 'Setup Complete!' : 'Setup Guide'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    'px-1.5 py-0.5 text-[10px]',
                    isComplete
                      ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                      : 'text-portal-primary bg-[hsl(var(--primary)/0.15)]',
                  )}
                >
                  {progressPercentage}%
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress
                value={progressPercentage}
                className={cn(
                  'h-2',
                  isComplete ? 'bg-green-200' : 'bg-secondary',
                )}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {progress ? `${progress.completed}/${progress.total}` : '0/8'}{' '}
                  configured
                </span>
                {!isComplete && (
                  <span>
                    {progress ? progress.total - progress.completed : 8}{' '}
                    remaining
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleOpenOnboarding}
              size="sm"
              variant={isComplete ? 'outline' : 'primary'}
              className={cn(
                'h-7 w-full gap-1.5 text-xs',
                isComplete &&
                  'border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/20',
              )}
            >
              {isComplete ? (
                <>
                  <Settings className="h-3 w-3" />
                  Review Setup
                </>
              ) : (
                <>
                  Continue Setup
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmationDialog
        isOpen={showDismissDialog}
        setIsOpen={setShowDismissDialog}
        title="Dismiss Onboarding"
        message="Are you sure you want to dismiss the onboarding guide?"
        onConfirm={() => {
          doNotShowAgain(); // Call the function to dismiss the onboarding
          setShowDismissDialog(false); // Close the dialog
        }}
        onCancel={() => setShowDismissDialog(false)} // Close the dialog without action
      />
    </div>
  );
}

export default OnboardingSidebar;
