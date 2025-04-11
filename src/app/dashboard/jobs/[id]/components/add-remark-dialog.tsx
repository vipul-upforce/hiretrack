import { useUpdateCandidateMutation } from "@/lib/features/candidate/candidateApi";
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
  const [updateCandidate] = useUpdateCandidateMutation();

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
          const updateData = {
            _id: candidate?._id,
            remarks: [...(candidate?.remarks || []), newRemarkObj],
          };
          toast({
            title: "Updating",
            description: `Updating ${candidate.name}'s remarks`,
          });

          await updateCandidate(updateData).unwrap();
          await refetch();

          setNewRemark("");
          setRemarkRating(null);
          setOpenRemarksFor("");

          toast({
            title: "Success",
            description: "Remark added successfully",
          });

          onOpenChange(false); // Close dialog after success
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
                onChange={(e, value) => setRemarkRating(value ? value : null)}
                defaultValue={0}
                precision={0.5}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddRemark}>Add Remark</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRemarksDialog;
