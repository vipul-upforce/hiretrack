import {
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
} from '@/lib/features/candidate/candidateApi';
import { Candidate } from '@/types/candidate';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Label } from '@/components/ui/label';
import { Rating } from '@mui/material';
import { Button } from '@/components/ui/button';
import { sentStatusMailHandler } from '@/lib/utils';
import { useSendStatusMailMutation } from '@/lib/features/org/orgApi';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
import { getTrackingDate } from '../../utils/candidateAccessors';
// import { sentRemarkMail } from "@/lib/utils";

function AddRemarksDialog({
  candidate,
  isOpen,
  onOpenChange,
  setOpenRemarksFor,
  refetch,
  onRemarkAdded,
}: {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
  onRemarkAdded?: (updatedCandidate: Candidate) => void;
}) {
  const [newRemark, setNewRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null,
  );
  const [updateCandidate] = useUpdateCandidateMutation();
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const { user } = useAppSelector((state) => state.auth || {});
  const [selectedMentions, setSelectedMentions] = useState<
    Array<{ _id: string; name: string; email: string; role: string }>
  >([]);

  const handleAddRemark = async () => {
    if (isSubmitting) return;
    if (user) {
      if (!newRemark.trim() || !user?.id) {
        toast({
          title: 'Error',
          description: 'Please add remarks',
          variant: 'destructive',
        });
        return;
      }
      setIsSubmitting(true);
      try {
        const newRemarkObj = {
          description: String(newRemark).trim(),
          date: new Date().toISOString(),
          rating: remarkRating ? Number(remarkRating) : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
        };
        const newRemarkHistoryObj = {
          description: String(newRemark).trim(),
          isPrivate: isSubRemarkPrivate,
          date: new Date().toISOString(),
          rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
          selectedMentionUserIds: selectedMentions.map((m) => m._id),
        };

        // debugger;
        // const updateData = {
        //   candidateId: candidate?._id,
        //   jobId: candidate.jobId,
        //   remarks: [...(candidate?.remarks || []), newRemarkObj],
        // };
        // const updateData = {
        //   _id: candidate?._id,
        //   name: candidate.name,
        //   remarks: [...(candidate?.remarks || []), newRemarkObj],
        // };
        // debugger;
        // const updateData = {
        //   candidateId: candidate?._id,
        //   jobId: candidate.jobId,
        //   remarks: [...(candidate?.remarks || []), newRemarkObj],
        // };
        const updateData = {
          _id: candidate?._id,
          name: candidate.name,
          jobId: candidate?.jobId,
          remarks: [...(candidate?.remarks || []), newRemarkObj],
        };

        const newHistoryEntry = {
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: null,
          remark: newRemarkHistoryObj,
          assignmentBy: user!.id,
          title: null,
          note: {
            description: '',
            date: '',
            rating: 0,
            userId: null,
          },
          attachments: [],
        };
        toast({
          title: 'Updating',
          description: `Updating ${candidate.name}'s remarks`,
        });
        // debugger;
        await updateCandidateHistory({
          candidateId: candidate?._id,
          jobId: candidate.jobId,
          newEntry: newHistoryEntry,
        }).unwrap();
        const updatedCandidate = await updateCandidate(updateData).unwrap();

        // Send status mail if status was recently updated (within 20 seconds)
        // This handles the case where remark dialog was opened after status update
        const updatedAt = getTrackingDate(candidate, 'updatedAt');
        const wasUpdatedRecently =
          updatedAt && Date.now() - updatedAt.getTime() <= 20 * 1000;

        if (wasUpdatedRecently) {
          await sentStatusMailHandler(updatedCandidate, sendStatusMail, {
            remark: newRemark.trim(),
            rating: remarkRating || undefined,
          });
        }
        // sentRemarkMail(result, sendEmail);

        onOpenChange(false);

        setNewRemark('');
        setRemarkRating(null);
        setRemarkRatingHistory(null);
        setOpenRemarksFor('');

        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        await refetch();
        // debugger;
        onRemarkAdded?.(updatedCandidate);
        toast({
          title: 'Success',
          description: 'Remark added successfully',
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        }
      } finally {
        setIsSubmitting(false);
      }

      // }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div />
      </DialogTrigger>
      <DialogContent size="lg" className="flex flex-col p-0">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>Add Remarks for {candidate.name}</DialogTitle>
          <DialogDescription>
            Add your observations and feedback for this candidate. You can
            include a rating and set privacy preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 px-6 py-4">
          <MentionTextarea
            placeholder="Add a remark... (Alt+Enter to submit)"
            className="max-h-80 overflow-y-auto"
            value={newRemark}
            onChange={setNewRemark}
            onKeyDown={(e) => {
              if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                if (newRemark.trim() && !isSubmitting) {
                  handleAddRemark();
                }
              }
            }}
            organizationId={(user?.organizationId as string) || ''}
            currentUserRole={user?.role || ''}
            rows={4}
            isRemarkPrivate={isSubRemarkPrivate}
            onSelectedMentionsChange={setSelectedMentions}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="rating">Ratings:</Label>
              <Rating
                name="half-rating"
                onChange={(_, value) => {
                  setRemarkRating(value || null);
                  setRemarkRatingHistory(value || null);
                }}
                defaultValue={0}
                precision={0.5}
                sx={{
                  '& .MuiRating-iconEmpty': {
                    color: 'rgb(156 163 175)',
                  },
                  '& .MuiRating-iconFilled': {
                    color: '#fbbf24',
                  },
                  '& .MuiRating-iconHover': {
                    color: '#f59e0b',
                  },
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
                <Label htmlFor="privacy-toggle" className="text-sm">
                  {isSubRemarkPrivate ? 'Private' : 'Public'}
                </Label>
              </div>

              <Switch
                id="privacy-toggle-submit"
                checked={isSubRemarkPrivate}
                onCheckedChange={() =>
                  setIsSubRemarkPrivate(!isSubRemarkPrivate)
                }
                className="border-1 ml-2 h-4 w-8 border border-solid drop-shadow-lg"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            No Remarks
          </Button>
          <Button
            onClick={handleAddRemark}
            disabled={isSubmitting || !newRemark.trim() || !user?.id}
            variant="info"
          >
            {isSubmitting ? 'Submitting...' : 'Add Remark'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddRemarksDialog;
