import {
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { Candidate } from "@/types/candidate";
import { useState } from "react";
import Cookies from "js-cookie";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Rating } from "@mui/material";
import { Button } from "@/components/ui/button";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { sentStatusMailHandler } from "@/lib/utils";
import { useSendStatusMailMutation } from "@/lib/features/org/orgApi";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
// import { sentRemarkMail } from "@/lib/utils";

const AddRemarksDialog = ({
  candidate,
  isOpen,
  onOpenChange,
  setOpenRemarksFor,
  refetch,
}: {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
}) => {
  const [newRemark, setNewRemark] = useState("");
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null
  );
  const [updateCandidate] = useUpdateCandidateMutation();
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(false);
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [sendStatusMail] = useSendStatusMailMutation();

  const handleAddRemark = async () => {
    const token = Cookies.get("token");
    if (token) {
      const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
      if (decryptedResponse.success && decryptedResponse.user) {
        const user = decryptedResponse.user;
        if (!newRemark.trim() || !user?.id) {
          toast({
            title: "Error",
            description: "Please add remarks",
            variant: "destructive",
          });
          return;
        }

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
            rating: remarkRatingHistory
              ? Number(remarkRatingHistory)
              : undefined,
            userId: {
              _id: user.id,
              name: user.name,
              email: user.email,
            },
          };

          // debugger;
          // const updateData = {
          //   candidateId: candidate?._id,
          //   jobId: candidate.jobId,
          //   remarks: [...(candidate?.remarks || []), newRemarkObj],
          // };
          const updateData = {
            _id: candidate?._id,
            name: candidate.name,
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
              description: "",
              date: "",
              rating: 0,
              userId: null,
            },
            attachments: [],
          };
          toast({
            title: "Updating",
            description: `Updating ${candidate.name}'s remarks`,
          });
          // debugger;
          await updateCandidateHistory({
            candidateId: candidate?._id,
            jobId: candidate.jobId,
            newEntry: newHistoryEntry,
          }).unwrap();
          const updatedCandidate = await updateCandidate(updateData).unwrap();
          await sentStatusMailHandler(updatedCandidate, sendStatusMail);
          // sentRemarkMail(result, sendEmail);

          onOpenChange(false);

          setNewRemark("");
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          setOpenRemarksFor("");

          await new Promise((resolve) => setTimeout(resolve, 100));
          await refetch();

          toast({
            title: "Success",
            description: "Remark added successfully",
          });
        } catch (error: unknown) {
          if (error instanceof Error) {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div></div>
      </DialogTrigger>
      <DialogContent className="w-[700px] p-6">
        <DialogHeader>
          <DialogTitle>Add Remarks for {candidate.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Add a remark..."
            className="max-h-80 overflow-y-auto"
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="rating">Rating:</Label>
              <Rating
                name="half-rating"
                onChange={(e, value) => {
                  setRemarkRating(value ? value : null);
                  setRemarkRatingHistory(value ? value : null);
                }}
                defaultValue={0}
                precision={0.5}
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
                  {isSubRemarkPrivate ? "Private" : "Public"}
                </Label>
              </div>

              <Switch
                id="privacy-toggle-submit"
                checked={isSubRemarkPrivate}
                onCheckedChange={() =>
                  setIsSubRemarkPrivate(!isSubRemarkPrivate)
                }
                className="w-8 h-4 drop-shadow-lg border border-1 border-solid ml-2"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            No Remarks
          </Button>
          <Button onClick={handleAddRemark}>Add Remark</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRemarksDialog;
