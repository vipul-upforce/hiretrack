import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// import { useState } from "react";
import Rating from "@mui/material/Rating";
import { IEditRemark } from "../schemas/EditRemarkDialog";

const EditRemarkDialog = ({
  isEditRemarkDialogOpen,
  setIsEditRemarkDialogOpen,
  editingRemark,
  setEditingRemark,
  handleRemarkUpdate,
  isLoading,
  setRemarkRating,
  setRemarkRatingHistory,
}: {
  isEditRemarkDialogOpen: boolean;
  setIsEditRemarkDialogOpen: (x: boolean) => void;
  editingRemark: IEditRemark | null;
  setEditingRemark: ({}: IEditRemark) => void;
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean
  ) => void;
  isLoading: boolean;
  setRemarkRating: (x: number | null) => void;
  setRemarkRatingHistory: (x: number | null) => void;
}) => {
  // const [remarkRating, setRemarkRating] = useState(editingRemark?.rating || 0);
  // const [remarkRatingHistory, setRemarkRatingHistory] = useState(
  //   editingRemark?.rating || 0
  // );

  return (
    <Dialog
      open={isEditRemarkDialogOpen}
      onOpenChange={setIsEditRemarkDialogOpen}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Remark</DialogTitle>
        </DialogHeader>
        <div className="">
          <Textarea
            className="min-h-[120px] resize-none focus-visible:ring-offset-1"
            placeholder="Enter your remark here..."
            value={editingRemark?.description || ""}
            onChange={(e) => {
              const input = e.target.value;
              const trimmed = input.trim();

              // Disallow null/empty/whitespace-only input
              if (trimmed === "") return;

              setEditingRemark({
                id: editingRemark?.id || "",
                rating: editingRemark?.rating,
                isPrivate: editingRemark?.isPrivate || false,
                description: input, // store original input, not trimmed
              });
            }}
          />
          <div className="flex items-center gap-2 mt-2">
            <Label htmlFor="rating">Rating:</Label>
            <Rating
              name="half-rating"
              onChange={(e, value) => {
                setRemarkRating(value ? value : null);
                setRemarkRatingHistory(value ? value : null);
              }}
              defaultValue={editingRemark?.rating || 0}
              precision={0.5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsEditRemarkDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={() => {
              handleRemarkUpdate(
                editingRemark?.id || "",
                editingRemark?.description || "",
                editingRemark?.isPrivate
              );
              setIsEditRemarkDialogOpen(false);
            }}
          >
            {isLoading ? "Marking as done..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRemarkDialog;
