"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "../OnboardingProvider";

const CompletionStep: React.FC = () => {
  const { progress, steps, setIsOpen } = useOnboarding();
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  const completedSteps = steps.filter((step) => step.isCompleted).length;
  const skippedSteps = steps.filter((step) => step.isSkipped).length;
  const remainingSteps = steps.length - completedSteps - skippedSteps;

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth * 0.63,
        height: window.innerHeight * 0.6,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  const handleGoToJobsBoard = () => {
    setIsOpen(false);
    router.push("/dashboard/jobs-board");
  };

  const handleGoToSettings = () => {
    setIsOpen(false);
    router.push("/dashboard/settings");
  };

  return (
    <div className="space-y-4 relative">
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto border border-border/50">
          <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Setup Complete!
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Your HireTrack platform is ready to streamline your hiring process.
          </p>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="border-2 border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completedSteps}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Completed
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {skippedSteps}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                Skipped
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-muted-foreground">
                {remainingSteps}
              </div>
              <div className="text-sm text-muted-foreground/80">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
              What's Next?
            </h3>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                <ArrowRight className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    Start Creating Jobs
                  </div>
                  <div className="text-blue-700 dark:text-blue-200 text-sm">
                    Head to the Jobs Board to create your first job posting
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                <Settings className="w-5 h-5 text-purple-500 dark:text-purple-400 mt-0.5" />
                <div>
                  <div className="font-medium text-purple-900 dark:text-purple-100">
                    Complete Remaining Settings
                  </div>
                  <div className="text-purple-700 dark:text-purple-200 text-sm">
                    You can always complete skipped configurations from the
                    settings page
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="primary"
          onClick={handleGoToJobsBoard}
          className="flex items-center gap-2"
        >
          Go to Jobs Board
          <ArrowRight className="w-4 h-4" />
        </Button>

        {remainingSteps > 0 && (
          <Button
            variant="outline"
            onClick={handleGoToSettings}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Complete Settings
          </Button>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          You can access this onboarding guide anytime from the sidebar until
          you choose to hide it.
        </p>
      </div>
    </div>
  );
};

export default CompletionStep;
