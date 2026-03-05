'use client';

import { useBulkUpdateCandidatesMutation } from '@/lib/features/candidate/candidateApi';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Label } from '@/components/ui/label';
import { Rating } from '@mui/material';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { clearSelectedCandidates } from '@/lib/redux/selectedCandidatesSlice';
import type { BulkReasonPayload } from './types';

export interface BulkReasonDialogProps {
  payload: BulkReasonPayload;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void | Promise<unknown>;
  onSuccess?: () => void;
}

export function BulkReasonDialog({
  payload,
  isOpen,
  onOpenChange,
  setOpenRemarksFor,
  refetch,
  onSuccess,
}: BulkReasonDialogProps) {
  const { candidateIds, newStatus, statusAlreadyApplied } = payload;
  const [newRemark, setNewRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [selectedMentions, setSelectedMentions] = useState<
    Array<{ _id: string; name: string; email: string; role: string }>
  >([]);

  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();
  const { user } = useAppSelector((state) => state.auth || {});
  const dispatch = useAppDispatch();

  const handleSubmit = async () => {
    if (isSubmitting || !user?.id) return;
    const description = newRemark.trim();
    if (!description) {
      toast({
        title: 'Error',
        description: 'Please add a reason',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (statusAlreadyApplied) {
        await bulkUpdateCandidates({
          candidateIds,
          operation: 'addRemark',
          description,
          isPrivate: isSubRemarkPrivate,
          rating: remarkRating ?? 0,
          selectedMentionUserIds: selectedMentions.map((m) => m._id),
        }).unwrap();
      } else {
        await bulkUpdateCandidates({
          candidateIds,
          operations: [
            {
              operation: 'statusUpdate',
              status: newStatus,
              remark: description,
            },
            {
              operation: 'addRemark',
              description,
              isPrivate: isSubRemarkPrivate,
              rating: remarkRating ?? 0,
              selectedMentionUserIds: selectedMentions.map((m) => m._id),
            },
          ],
        }).unwrap();
      }

      toast({
        title: 'Success',
        description: `Reason added for ${candidateIds.length} candidate(s)`,
      });
      setOpenRemarksFor(null);
      onOpenChange(false);
      setNewRemark('');
      setRemarkRating(null);
      onSuccess?.();
      await refetch();
      dispatch(clearSelectedCandidates());
    } catch (err) {
      toast({
        title: 'Error',
        description: (err as Error)?.message ?? 'Failed to add reason',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setOpenRemarksFor(null);
    onOpenChange(open);
  };

  const count = candidateIds.length;
  const organizationId = (user as { organizationId?: string })?.organizationId ?? '';
  const userRole = (user as { role?: string })?.role ?? '';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" className="flex flex-col p-0">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>Add reason for status change</DialogTitle>
          <DialogDescription>
            This reason will be applied to{' '}
            <span className="font-semibold text-foreground">{count}</span>{' '}
            candidate{count !== 1 ? 's' : ''}. You can include a rating and set
            privacy.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 px-6 py-4">
          <MentionTextarea
            placeholder="Add a reason for the status change... (Alt+Enter to submit)"
            className="max-h-80 overflow-y-auto"
            value={newRemark}
            onChange={setNewRemark}
            onKeyDown={(e) => {
              if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                if (newRemark.trim() && !isSubmitting) handleSubmit();
              }
            }}
            organizationId={organizationId}
            currentUserRole={userRole}
            rows={4}
            isRemarkPrivate={isSubRemarkPrivate}
            onSelectedMentionsChange={setSelectedMentions}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="bulk-reason-rating">Rating:</Label>
              <Rating
                name="bulk-reason-rating"
                value={remarkRating}
                onChange={(_, value) => setRemarkRating(value ?? null)}
                precision={0.5}
                sx={{
                  '& .MuiRating-iconEmpty': { color: 'rgb(156 163 175)' },
                  '& .MuiRating-iconFilled': { color: '#fbbf24' },
                  '& .MuiRating-iconHover': { color: '#f59e0b' },
                }}
              />
            </div>
            <div className="flex flex-row items-center justify-evenly">
              <div className="flex items-center space-x-2">
                {isSubRemarkPrivate ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
                <Label htmlFor="bulk-reason-privacy" className="text-sm">
                  {isSubRemarkPrivate ? 'Private' : 'Public'}
                </Label>
              </div>
              <Switch
                id="bulk-reason-privacy"
                checked={isSubRemarkPrivate}
                onCheckedChange={() => setIsSubRemarkPrivate((p) => !p)}
                className="ml-2 h-4 w-8 border border-solid border-border drop-shadow-lg"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newRemark.trim() || !user?.id}
            variant="info"
          >
            {isSubmitting ? 'Submitting...' : `Add reason for ${count} candidate${count !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
