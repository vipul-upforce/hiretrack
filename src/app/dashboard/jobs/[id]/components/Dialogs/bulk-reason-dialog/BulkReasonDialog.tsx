'use client';

import { useBulkUpdateCandidatesMutation } from '@/lib/features/candidate/candidateApi';
import { useEffect, useRef, useState } from 'react';
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
import { setActorJustStatusUpdatedCandidateId } from '@/lib/sseActorStatus';
import type { BulkUpdateOperationParams } from '@/app/api/candidates/bulk-update/types';
import type { BulkReasonPayload } from './types';

export interface BulkReasonDialogProps {
  payload: BulkReasonPayload;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setOpenRemarksFor: (id: string | null) => void;
  refetch?: () => void | Promise<unknown>;
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
  const {
    candidateIds,
    newStatus,
    statusAlreadyApplied, operations: preOperations,
    pendingOperations,
    applyWithoutReason,
  } =
    payload;
  const baseOperations = preOperations ?? [];
  const [newRemark, setNewRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [selectedMentions, setSelectedMentions] = useState<
    Array<{ _id: string; name: string; email: string; role: string }>
  >([]);
  const submittedRef = useRef(false);
  const closeHandledRef = useRef(false);

  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();
  const { user } = useAppSelector((state) => state.auth || {});
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isOpen) {
      submittedRef.current = false;
      closeHandledRef.current = false;
    }
  }, [isOpen, candidateIds, newStatus]);

  useEffect(() => {
    if (isOpen) {
      submittedRef.current = false;
      closeHandledRef.current = false;
    }
  }, [isOpen, candidateIds, newStatus]);

  const didUserSubmitRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      didUserSubmitRef.current = false;
    }
  }, [isOpen]);

  const getBaseOperations = (): BulkUpdateOperationParams[] => {
    const raw = pendingOperations ?? baseOperations;
    const ops = Array.isArray(raw)
      ? raw.filter(
          (op): op is BulkUpdateOperationParams =>
            !!op && typeof op === 'object' && 'operation' in op,
        )
      : [];
    if (statusAlreadyApplied) return ops;
    return ops.filter((op) => op.operation !== 'statusUpdate');
  };

  const buildOperations = (description?: string) => {
    const trimmed = description?.trim();
    const operations = [...getBaseOperations()];
    if (!statusAlreadyApplied) {
      operations.push({
        operation: 'statusUpdate',
        status: newStatus,
        ...(trimmed ? { remark: trimmed } : {}),
      });
    }
    if (trimmed) {
      operations.push({
        operation: 'addRemark',
        description: trimmed,
        isPrivate: isSubRemarkPrivate,
        rating: remarkRating ?? 0,
        selectedMentionUserIds: selectedMentions.map((m) => m._id),
      });
    }
    return operations;
  };

  const submitBulkUpdate = async (
    description: string,
    {
      requireReason,
      closeOnSuccess,
    }: { requireReason: boolean; closeOnSuccess: boolean },
  ): Promise<boolean> => {
    if (isSubmitting || !user?.id) return false;
    const trimmed = description.trim();
    if (requireReason && !trimmed) {
      toast({
        title: 'Error',
        description: 'Please add a reason',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const operations = buildOperations(trimmed || undefined);
      if (operations.length === 0) {
        toast({
          title: 'Info',
          description: 'No updates to apply',
        });
        return false;
      }

      if (isMountedRef.current) {
        setIsSubmitting(true);
      }
      await bulkUpdateCandidates({
        candidateIds,
        operations,
      }).unwrap();

      for (const id of candidateIds) {
        setActorJustStatusUpdatedCandidateId(String(id));
      }

      toast({
        title: 'Success',
        description: trimmed
          ? `Reason added for ${candidateIds.length} candidate(s)`
          : `Updated ${candidateIds.length} candidate(s)`,
      });
      if (closeOnSuccess) {
        setOpenRemarksFor(null);
        onOpenChange(false);
      }
      onSuccess?.();
      dispatch(clearSelectedCandidates());
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: (err as Error)?.message ?? 'Failed to update candidates',
        variant: 'destructive',
      });
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async () => {
    didUserSubmitRef.current = true;
    const success = await submitBulkUpdate(newRemark, {
      requireReason: true,
      closeOnSuccess: true,
    });
    if (success && isMountedRef.current) {
      setNewRemark('');
      setRemarkRating(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (
        !submittedRef.current &&
        !closeHandledRef.current &&
        !statusAlreadyApplied &&
        candidateIds.length > 0 &&
        newStatus?.trim() &&
        !isSubmitting
      ) {
        closeHandledRef.current = true;
        // Same anti-double-delta marker as the submit path.
        for (const id of candidateIds) {
          setActorJustStatusUpdatedCandidateId(String(id));
        }
        bulkUpdateCandidates({
          candidateIds,
          operations: [
            ...baseOperations,
            {
              operation: 'statusUpdate',
              status: newStatus,
            },
          ],
        })
          .unwrap()
          .then((result) => {
            toast({
              title: 'Success',
              description:
                result.message ||
                `Status updated for ${candidateIds.length} candidate(s)`,
            });
            onSuccess?.();
            dispatch(clearSelectedCandidates());

            if (refetch) {
              refetch();
            }
          })
          .catch((err) => {
            toast({
              title: 'Error',
              description: (err as Error)?.message ?? 'Failed to update status',
              variant: 'destructive',
            });
          });
      }
      setOpenRemarksFor(null);
    }
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
