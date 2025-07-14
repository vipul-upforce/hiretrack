import { Candidate } from "@/types/candidate";
import React, { Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
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
}) => {
  //   const [newFollowUp, setNewFollowUP] = useState("");
  //   const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div></div>
      </DialogTrigger>
      <DialogContent className="w-[700px] p-6">
        <DialogHeader>
          <DialogTitle>Create A Followup for {candidate.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Add the note..."
            className="max-h-80 overflow-y-auto"
            value={newFollowUp}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNewFollowUp(e.target.value)
            }
          />
          {/* <DateTimePicker
            value={newFollowUpDate || dayjs(candidate?.followUp?.date) || null}
            onChange={(date: Dayjs | null) => {
              setNewFollowUpDate(date || null);
            }}
          /> */}
          <DateTimePicker
            value={
              newFollowUpDate ||
              (candidate?.followUp?.date
                ? dayjs(candidate.followUp.date)
                : null)
            }
            onChange={(date: Dayjs | null) => setNewFollowUpDate(date)}
          />
        </div>
        <DialogFooter>
          {candidate?.followUp?.note &&
            candidate?.followUp?.note.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  handleRemoveFollowUp();
                  onAddingFollowup();
                }}
              >
                Remove Followup
              </Button>
            )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleAddFollowUp();
              onAddingFollowup();
            }}
          >
            Create Followup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFollowUpDialog;
