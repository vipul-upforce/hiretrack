"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnboarding } from "./OnboardingProvider";
import OnboardingWizard from "./OnboardingWizard";

const OnboardingModal: React.FC = () => {
  const { isOpen, setIsOpen, onboardingStatus, isLoading } = useOnboarding();
  const [isLargeViewport, setIsLargeViewport] = useState(false);

  useEffect(() => {
    const checkViewportSize = () => {
      const isLarge = window.innerWidth >= 1200 && window.innerHeight >= 800;
      setIsLargeViewport(isLarge);
    };

    checkViewportSize();
    window.addEventListener("resize", checkViewportSize);
    return () => window.removeEventListener("resize", checkViewportSize);
  }, []);

  // Don't render if user has chosen "do not show again"
  // TESTING: Comment out to always allow modal to show
  // if (onboardingStatus?.doNotShowAgain) {
  //   return null;
  // }

  const dialogClassName = isLargeViewport
    ? "!max-w-[80vw] !min-w-[950px] !h-[90vh] !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] xl:!max-w-[70vw] overflow-hidden p-0 gap-0 !flex !flex-col"
    : "!max-w-[95vw] !w-[95vw] !h-[95vh] !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] overflow-hidden p-0 gap-0 rounded-lg !flex !flex-col";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={dialogClassName}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Compact Header */}
        <DialogHeader className="px-6 py-2 border-b border-border flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Setup Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-background min-h-0">
          {!isLoading && <OnboardingWizard />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
