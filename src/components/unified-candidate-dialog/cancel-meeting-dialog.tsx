import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Loader2 } from 'lucide-react';

interface CancelMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingType?: string;
  cancelNotes: string;
  setCancelNotes: (notes: string) => void;
  onConfirm: () => void;
  isCancelling: boolean;
}

export function CancelMeetingDialog({
  open,
  onOpenChange,
  meetingType = 'Meeting',
  cancelNotes,
  setCancelNotes,
  onConfirm,
  isCancelling,
}: CancelMeetingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DialogHeader className="flex flex-col gap-2 border-b p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Cancel {meetingType}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/90">
            Are you sure you want to cancel this {meetingType}? This action
            cannot be undone and attendees will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Label
              htmlFor="cancelNotes"
              className="text-sm font-semibold text-foreground"
            >
              Cancellation Notes{' '}
              <span className="font-normal text-muted-foreground">
                (Optional)
              </span>
            </Label>
            <Textarea
              id="cancelNotes"
              placeholder="Reason for cancellation, rescheduling information, or other notes..."
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              className="min-h-[60px] resize-y focus-visible:ring-offset-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-3 bg-background p-6 pt-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="mt-2 sm:mt-0"
            onClick={() => {
              onOpenChange(false);
              setCancelNotes('');
            }}
          >
            Keep Meeting
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isCancelling}
            onClick={onConfirm}
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel Meeting
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

