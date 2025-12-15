'use client';

import { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Job } from '@/types/job';
import { Separator } from '@/components/ui/separator';
import { EditJobForm } from './edit-job-form';
import { DetailsDialog } from '../../jobs/[id]/components/Dialogs/DetailsDialog';
import { jobDetailsFields } from './job-details-fields';

interface JobDetailsDialogProps {
  job: Job | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  onJobUpdate: (job: Job) => void;
  isEditMode?: boolean;
}

export function JobDetailsDialog({
  job,
  isOpen,
  onOpenChange,
  userRole,
  onJobUpdate,
  isEditMode = false,
}: JobDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(isEditMode);
  const canEdit = userRole === 'hr' || userRole === 'admin';

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
    <DialogHeader className="px-6 pt-6 pb-4">
      <DialogTitle className="text-2xl font-bold tracking-tight">
        Job Details
      </DialogTitle>
      <p className="text-sm text-muted-foreground mt-1">
        View and manage job information
      </p>
    </DialogHeader>
  );

  const body = isEditing ? (
    <div className="flex-1 overflow-y-auto px-0 space-y-6">
      <EditJobForm
        job={job}
        onSave={(updatedJob) => {
          onJobUpdate?.(updatedJob);
          if (isEditMode) {
            handleClose();
          } else {
            setIsEditing(false);
          }
        }}
        onCancel={() => {
          if (isEditMode) {
            handleClose();
          } else {
            setIsEditing(false);
          }
        }}
      />
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      <div className="space-y-6">
        {jobDetailsFields.map((field, index) => {
          if (field.shouldRender && !field.shouldRender(job)) return null;
          return (
            <div key={index} className="group">
              <Label className="text-sm font-semibold text-foreground uppercase tracking-wide block mb-3">
                {field.label.split(' |||||(')[0]}
              </Label>
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 hover:border-border/80 transition-colors">
                {field.render(job)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const footer = canEdit && (
    <div className="flex justify-end space-x-2 border-t bg-muted/20 px-6 py-4">
      <Button
        variant="outline"
        onClick={handleClose}
        className="font-medium bg-transparent"
      >
        Close
      </Button>
      <Button
        onClick={() => setIsEditing(true)}
        variant="primary"
        className="font-medium"
      >
        Edit Job
      </Button>
    </div>
  );

  return (
    <DetailsDialog open={isOpen} onOpenChange={handleClose}>
      {header}
      <Separator className="mx-auto" />
      {body}
      {isEditing ? null : footer}
    </DetailsDialog>
  );
}
