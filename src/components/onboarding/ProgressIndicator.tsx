'use client';

import React, { useEffect, useRef } from 'react';
import { Check, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from './OnboardingProvider';

function ProgressIndicator() {
  const { steps, currentStepIndex } = useOnboarding();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll to center the current step
  useEffect(() => {
    const stepNumber = currentStepIndex;
    const stepElement = stepRefs.current.get(stepNumber);

    if (stepElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const containerWidth = container.clientWidth;
        const elementLeft = stepElement.offsetLeft;
        const elementWidth = stepElement.offsetWidth;

        // Calculate the scroll position to center the element
        const scrollLeft = elementLeft - containerWidth / 2 + elementWidth / 2;

        // Clamp scroll position to valid range
        const maxScroll = container.scrollWidth - containerWidth;
        const clampedScroll = Math.max(0, Math.min(scrollLeft, maxScroll));

        container.scrollTo({
          left: clampedScroll,
          behavior: 'smooth',
        });
      });
    }
  }, [currentStepIndex]);

  const setStepRef = (stepNumber: number, element: HTMLDivElement | null) => {
    if (element) {
      stepRefs.current.set(stepNumber, element);
    } else {
      stepRefs.current.delete(stepNumber);
    }
  };

  return (
    <div className="flex justify-center">
      <div
        ref={scrollContainerRef}
        className="flex items-center space-x-3 overflow-x-auto pb-2"
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1; // +1 because welcome step is 0
          const isCurrent = currentStepIndex === stepNumber;
          // Prioritize completed over skipped - if completed, show as completed even if previously skipped
          const isCompleted = step.isCompleted && !isCurrent;
          const isSkipped = step.isSkipped && !step.isCompleted && !isCurrent;

          return (
            <React.Fragment key={step.id}>
              <div
                ref={(el) => setStepRef(stepNumber, el)}
                className="flex items-center"
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-300',
                    {
                      // Current step
                      'border-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-200 dark:shadow-blue-900/50':
                        isCurrent,
                      // Completed step (show green for any completed step that's not current)
                      // Takes priority over skipped
                      'border-green-500 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-200 dark:shadow-green-900/50':
                        isCompleted,
                      // Skipped step (show yellow only if not completed and not current)
                      'border-yellow-500 bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-yellow-200 dark:shadow-yellow-900/50':
                        isSkipped,
                      // Future step (not completed or skipped, and not current)
                      'hover:border-primary/50 border-border bg-background text-muted-foreground hover:bg-muted/50':
                        !isCurrent && !step.isCompleted && !step.isSkipped,
                      // Past step (not completed or skipped, and not current)
                      'border-muted-foreground/40 bg-muted text-muted-foreground':
                        !isCurrent && !step.isCompleted && !step.isSkipped,
                    },
                  )}
                >
                  {isCompleted && <Check className="h-5 w-5" />}
                  {isSkipped && <SkipForward className="h-4 w-4" />}
                  {(isCurrent || (!step.isCompleted && !step.isSkipped)) && (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>

                {/* Step Label */}
                <div className="ml-3 hidden min-w-0 sm:block">
                  <div
                    className={cn('max-w-32 truncate text-sm font-medium', {
                      'text-blue-600 dark:text-blue-400': isCurrent,
                      'text-green-600 dark:text-green-400': isCompleted,
                      'text-yellow-600 dark:text-yellow-400': isSkipped,
                      'text-muted-foreground':
                        !isCurrent && !step.isCompleted && !step.isSkipped,
                    })}
                  >
                    {step.title}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-1 w-8 rounded-full transition-all duration-300',
                    {
                      'bg-gradient-to-r from-blue-300 to-purple-400 dark:from-blue-600 dark:to-purple-700':
                        currentStepIndex === stepNumber,
                      'bg-gradient-to-r from-green-400 to-emerald-500 dark:from-green-600 dark:to-emerald-700':
                        step.isCompleted,
                      'bg-gradient-to-r from-yellow-400 to-orange-500 dark:from-yellow-600 dark:to-orange-700':
                        step.isSkipped && !step.isCompleted,
                      'bg-border dark:bg-border':
                        !step.isCompleted && !step.isSkipped,
                    },
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressIndicator;
