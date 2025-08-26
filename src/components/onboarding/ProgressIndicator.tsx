"use client";

import React from "react";
import { Check, X, SkipForward } from "lucide-react";
import { useOnboarding } from "./OnboardingProvider";
import { cn } from "@/lib/utils";

const ProgressIndicator: React.FC = () => {
  const { steps, currentStepIndex } = useOnboarding();

  return (
    <div className="flex justify-center">
      <div className="flex items-center space-x-3 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1; // +1 because welcome step is 0
          const isCurrent = currentStepIndex === stepNumber;
          const isPast = currentStepIndex > stepNumber;
          const isFuture = currentStepIndex < stepNumber;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm",
                    {
                      // Current step
                      "border-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-200 dark:shadow-blue-900/50":
                        isCurrent,
                      // Completed step
                      "border-green-500 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-200 dark:shadow-green-900/50":
                        isPast && step.isCompleted,
                      // Skipped step
                      "border-yellow-500 bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-yellow-200 dark:shadow-yellow-900/50":
                        isPast && step.isSkipped,
                      // Future step
                      "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50":
                        isFuture,
                      // Past step (not completed or skipped)
                      "border-muted-foreground/40 bg-muted text-muted-foreground":
                        isPast && !step.isCompleted && !step.isSkipped,
                    }
                  )}
                >
                  {isPast && step.isCompleted && <Check className="w-5 h-5" />}
                  {isPast && step.isSkipped && (
                    <SkipForward className="w-4 h-4" />
                  )}
                  {(isCurrent ||
                    isFuture ||
                    (isPast && !step.isCompleted && !step.isSkipped)) && (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>

                {/* Step Label */}
                <div className="ml-3 hidden sm:block min-w-0">
                  <div
                    className={cn("text-sm font-medium truncate max-w-32", {
                      "text-blue-600 dark:text-blue-400": isCurrent,
                      "text-green-600 dark:text-green-400":
                        isPast && step.isCompleted,
                      "text-yellow-600 dark:text-yellow-400":
                        isPast && step.isSkipped,
                      // "text-muted-foreground": isFuture,
                      "text-muted-foreground":
                        isPast && !step.isCompleted && !step.isSkipped,
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
                    "w-8 h-1 mx-2 rounded-full transition-all duration-300",
                    {
                      "bg-gradient-to-r from-blue-300 to-purple-400 dark:from-blue-600 dark:to-purple-700":
                        currentStepIndex === stepNumber,
                      "bg-gradient-to-r from-green-400 to-emerald-500 dark:from-green-600 dark:to-emerald-700":
                        currentStepIndex > stepNumber,
                      "bg-border dark:bg-border": currentStepIndex < stepNumber,
                    }
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;
