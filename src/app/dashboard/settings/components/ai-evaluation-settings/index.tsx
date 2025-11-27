"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useEvaluationSettings } from "./hooks/useEvaluationSettings";
import { EvaluationSettingsContent } from "./content";
import { EvaluationSkeleton } from "./loading-skeleton";

interface EvaluationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EvaluationSettings({
  isOpen,
  onClose,
}: EvaluationSettingsProps) {
  const {
    config,
    updateConfig,
    saveSettings,
    resetSettings,
    isFetching,
    isSaving,
  } = useEvaluationSettings(isOpen, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[min(1400px,95vw)] h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>AI Evaluation Settings</DialogTitle>
          <DialogDescription>
            Configure how candidates are automatically evaluated using AI
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content or Skeleton */}
        {isFetching ? (
          <EvaluationSkeleton />
        ) : (
          <EvaluationSettingsContent
            config={config}
            updateConfig={updateConfig}
          />
        )}

        {/* Fixed Footer */}
        <div className="flex items-center justify-between border-t bg-background px-6 py-4 mt-auto">
          <Button
            variant="outline"
            onClick={resetSettings}
            className="gap-2"
            disabled={isFetching || isSaving}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveSettings}
              disabled={isFetching || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
