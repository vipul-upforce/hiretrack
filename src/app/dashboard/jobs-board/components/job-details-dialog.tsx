"use client";

import { useState, useEffect } from "react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EditJobForm } from "./edit-job-form";
import { Job } from "@/types/job";
import { DetailsDialog } from "../../jobs/[id]/components/Dialogs/DetailsDialog";
import { jobDetailsFields } from "./job-details-fields";

interface JobDetailsDialogProps {
  job: Job | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  onJobUpdate: (job: Job) => void;
  isEditMode?: boolean;
}

const labelClass = "font-semibold text-base";

export function JobDetailsDialog({
  job,
  isOpen,
  onOpenChange,
  userRole,
  onJobUpdate,
  isEditMode = false,
}: JobDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(isEditMode);
  const canEdit = userRole === "hr" || userRole === "admin";

  // Update isEditing when isEditMode prop changes
  useEffect(() => {
    setIsEditing(isEditMode);
  }, [isEditMode]);

  if (!job) return null;

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };
  const header = (
    <DialogHeader className="px-6 pt-6 ">
      <DialogTitle className="text-lg font-semibold">Job Details</DialogTitle>
    </DialogHeader>
  );

  const body = isEditing ? (
    <div className="flex-1 overflow-y-auto px-0  space-y-6 ">
      <EditJobForm
        job={job}
        onSave={(updatedJob) => {
          onJobUpdate?.(updatedJob);
          setIsEditing(false);
          onOpenChange(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto px-6 py-4 pt-4 space-y-6 border-t">
      {jobDetailsFields.map((field, index) => {
        if (field.shouldRender && !field.shouldRender(job)) return null;
        return (
          <div key={index} className="space-y-2">
            <Label className={labelClass}>
              {field.label.split(" |||||(")[0]}
            </Label>
            {field.render(job)}
          </div>
        );
      })}
    </div>
  );

  const footer = canEdit && (
    <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4">
      <Button variant="outline" onClick={handleClose}>
        Close
      </Button>
      <Button onClick={() => setIsEditing(true)}>Edit Job</Button>
    </div>
  );

  return (
    <DetailsDialog open={isOpen} onOpenChange={handleClose}>
      {header}
      {body}
      {isEditing ? null : footer}
    </DetailsDialog>
  );
}
