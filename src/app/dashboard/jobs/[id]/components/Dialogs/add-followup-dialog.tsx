import { Candidate } from "@/types/candidate";
import React, { Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { Loader2 } from "lucide-react";
// import { sentRemarkMail } from "@/lib/utils";

const AddFollowUpDialog = ({
  candidate,
  isOpen,
  onOpenChange,
  //   setOpenRemarksFor,
  refetch,
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
  refetch: () => void;
  handleAddFollowUp: () => void;
  setNewFollowUp: Dispatch<SetStateAction<string>>;
  setNewFollowUpDate: Dispatch<SetStateAction<Dayjs | null>>;
  newFollowUp: string;
  newFollowUpDate?: Dayjs | null;
  onAddingFollowup: () => void;
  handleRemoveFollowUp: () => void;
  isLoading: boolean;
}) => {
  //   const [newFollowUp, setNewFollowUP] = useState("");
  //   const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div></div>
      </DialogTrigger>
      <DialogContent className="w-[700px] p-0  flex flex-col ">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>Create A Followup for {candidate.name}</DialogTitle>
          <DialogDescription>
            Schedule a follow-up reminder for this candidate.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 px-6 py-4 space-y-4">
          <Textarea
            placeholder="Add the note..."
            className="max-h-80 overflow-y-auto"
            value={newFollowUp}
            onChange={(e) => setNewFollowUp(e.target.value)}
          />
          <div className="relative" style={{ zIndex: 100 }}>
            <DateTimePicker
              value={newFollowUpDate !== undefined ? newFollowUpDate : (candidate?.followUp?.date ? dayjs(candidate.followUp.date) : null)}
              onChange={(date) => setNewFollowUpDate(date)}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center border-t bg-background px-6 py-4 sticky bottom-0 z-10">
          <div className="flex-1">
            {candidate?.followUp?.note &&
              candidate?.followUp?.note.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNewFollowUpDate(null);
                    handleRemoveFollowUp();
                    onAddingFollowup();
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Remove Followup
                </Button>
              )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="info"
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
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {candidate?.followUp?.note && candidate?.followUp?.note.length > 0
                ? "Update Followup"
                : "Create Followup"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFollowUpDialog;
