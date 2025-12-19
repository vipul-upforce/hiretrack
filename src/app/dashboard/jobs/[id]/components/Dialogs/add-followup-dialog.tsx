import { Candidate } from '@/types/candidate';
import React, { Dispatch, SetStateAction } from 'react';
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
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
// import { sentRemarkMail } from "@/lib/utils";

function AddFollowUpDialog({
  candidate,
  isOpen,
  onOpenChange,
  //   setOpenRemarksFor,
  handleAddFollowUp,
  setNewFollowUp,
  setNewFollowUpDate,
  newFollowUp,
  newFollowUpDate,
  onAddingFollowup,
  handleRemoveFollowUp,
  isLoading,
}: {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  //   setOpenRemarksFor: (id: string | null) => void;
  handleAddFollowUp: () => void;
  setNewFollowUp: Dispatch<SetStateAction<string>>;
  setNewFollowUpDate: Dispatch<SetStateAction<Dayjs | null>>;
  newFollowUp: string;
  newFollowUpDate?: Dayjs | null;
  onAddingFollowup: () => void;
  handleRemoveFollowUp: () => void;
  isLoading: boolean;
}) {
  const { user } = useAppSelector((state) => state.auth || {});

  //   const [newFollowUp, setNewFollowUP] = useState("");
  //   const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div />
      </DialogTrigger>
      <DialogContent className="flex w-[700px] flex-col p-0">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>
            Create A Followup for
            {candidate.name}
          </DialogTitle>
          <DialogDescription>
            Schedule a follow-up reminder for this candidate.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 px-6 py-4">
          <MentionTextarea
            placeholder="Add the note... (Alt+Enter to submit)"
            className="max-h-80 overflow-y-auto"
            value={newFollowUp}
            onChange={setNewFollowUp}
            onKeyDown={(e) => {
              if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                if (newFollowUp.trim() && !isLoading) {
                  handleAddFollowUp();
                  onAddingFollowup();
                }
              }
            }}
            organizationId={(user?.organizationId as string) || ''}
            currentUserRole={user?.role || ''}
            rows={4}
          />
          <div className="relative" style={{ zIndex: 100 }}>
            <DateTimePicker
              value={(() => {
                if (newFollowUpDate !== undefined) {
                  return newFollowUpDate;
                }
                if (candidate?.followUp?.date) {
                  return dayjs(candidate.followUp.date);
                }
                return null;
              })()}
              onChange={(date) => setNewFollowUpDate(date)}
            />
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 z-10 flex items-center justify-between border-t bg-background px-6 py-4">
          <div className="flex-1">
            {(candidate?.followUp?.date || candidate?.followUp?.note) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setNewFollowUpDate(null);
                  handleRemoveFollowUp();
                  onAddingFollowup();
                }}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove Followup
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleAddFollowUp();
                onAddingFollowup();
              }}
              variant="info"
              disabled={isLoading || (!newFollowUp.trim() && !newFollowUpDate)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {candidate?.followUp?.note || candidate?.followUp?.date
                ? 'Update Followup'
                : 'Create Followup'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddFollowUpDialog;
