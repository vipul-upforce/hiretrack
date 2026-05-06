'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BatchOperationsPanel, type BatchOperations } from './batch-operations';

function cloneBatchOperations(value: BatchOperations): BatchOperations {
  return { ...value };
}

interface ConfirmPayload {
  total: number;
  selected: number;
  message: string;
}

interface BatchActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: BatchOperations;
  onOperationsChange: (operations: BatchOperations) => void;
  isPosting: boolean;
  organizationId: string;
  userRole: string;
}

export function BatchActionsDialog({
  open,
  onOpenChange,
  operations,
  onOperationsChange,
  isPosting,
  organizationId,
  userRole,
}: BatchActionsDialogProps) {
  const [draft, setDraft] = useState<BatchOperations>(() =>
    cloneBatchOperations(operations),
  );

  useEffect(() => {
    if (open) {
      setDraft(cloneBatchOperations(operations));
    }
  }, [open, operations]);

  const handleOk = () => {
    onOperationsChange(cloneBatchOperations(draft));
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="flex max-h-[90vh] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="border-0 px-6 py-3 pt-5">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            Batch Actions
          </DialogTitle>
        </DialogHeader>

        <div className="border-b px-6 py-3">
          <BatchOperationsPanel
            value={draft}
            onChange={setDraft}
            disabled={isPosting}
            organizationId={organizationId}
            userRole={userRole}
            variant="toggles"
          />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 px-6 py-4">
          <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            Actions apply only to the CVs you select in the list. Use Process
            Batch when you are ready to run processing.
          </div>
          <BatchOperationsPanel
            value={draft}
            onChange={setDraft}
            disabled={isPosting}
            organizationId={organizationId}
            userRole={userRole}
            variant="sections"
          />
        </div>

        <DialogFooter className="border-t bg-background px-6 py-3">
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="min-w-[100px]"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="info"
              onClick={handleOk}
              disabled={isPosting}
              className="min-w-[100px] font-medium shadow-sm transition-all hover:shadow-md"
            >
              OK
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ConfirmPayload | null;
  onConfirm: () => void;
}

export function ConfirmProcessingDialog({
  open,
  onOpenChange,
  payload,
  onConfirm,
}: ConfirmProcessingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader>
          <DialogTitle className=" pt-3">
            Confirm Batch Processing
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-6 py-2 text-sm text-muted-foreground">
          <p>{payload?.message}</p>
          <p>Do you want to continue?</p>
        </div>
        <DialogFooter className="border-t bg-background px-6 py-4">
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="info"
              onClick={onConfirm}
            >
              Confirm & Process
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmRemoveSelectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
}

export function ConfirmRemoveSelectedDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: ConfirmRemoveSelectedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader>
          <DialogTitle className="pt-3">
            Remove Selected CVs
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-6 py-2 text-sm text-muted-foreground">
          <p>
            You are about to remove
            {' '}
            <span className="font-semibold text-foreground">{selectedCount}</span>
            {' '}
            selected CV(s) from the current batch list.
          </p>
          <p>This action cannot be undone.</p>
        </div>
        <DialogFooter className="border-t bg-background px-6 py-4">
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
            >
              Remove Selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
