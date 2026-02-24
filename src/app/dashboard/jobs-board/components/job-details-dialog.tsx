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
    <DialogHeader className="px-6 pb-4 pt-6">
      <DialogTitle className="text-2xl font-bold tracking-tight">
        Job Details
      </DialogTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        View and manage job information
      </p>
    </DialogHeader>
  );

  const body = isEditing ? (
    <div className="flex-1 space-y-6 overflow-y-auto px-0">
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
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      <div className="space-y-6">
        {jobDetailsFields.map((field) => {
          if (field.shouldRender && !field.shouldRender(job)) return null;
          return (
            <div key={`${field.label}`} className="group">
              <Label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-foreground">
                {field.label.split(' |||||(')[0]}
              </Label>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:border-border/80">
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
        className="bg-transparent font-medium"
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
