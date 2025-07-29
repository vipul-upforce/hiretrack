import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import Rating from "@mui/material/Rating";

const ConfirmAndRemarkDialog = ({
  isOpen,
  setIsOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  loadingText = "Marking as done...",
  message,
  title = "Mark as Done",
}: {
  isOpen: boolean;
  setIsOpen: (x: boolean) => void;
  onConfirm: (description: string, rating: number | null) => void;
  onCancel: () => void;
  isLoading?: boolean;
  loadingText?: string;
  title?: string;
  assignmentId?: string;
  onAddHistoryEntry?: (historyEntry: any) => void;
  message?: string;
}) => {
  // Local state for the form
  const [remarkDescription, setRemarkDescription] = useState("");
  const [remarkRating, setRemarkRating] = useState<number | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRemarkDescription("");
      setRemarkRating(null);
    }
  }, [isOpen]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setIsOpen(false);
  };

  const handleConfirm = () => {
    // Pass the form data to parent
    onConfirm(remarkDescription.trim(), remarkRating);
    setIsOpen(false);
  };

  //   const isFormValid = remarkDescription.trim().length > 0; // Require at least some text

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="overflow-hidden flex flex-col" size="lg">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div>
            <Label htmlFor="remark-textarea">Remark</Label>
            <Textarea
              id="remark-textarea"
              className="min-h-[120px] resize-none focus-visible:ring-offset-1 mt-2"
              placeholder="Enter your remark here..."
              value={remarkDescription}
              onChange={(e) => setRemarkDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="rating">Rating:</Label>
            <Rating
              name="task-rating"
              value={remarkRating}
              onChange={(e, value) => setRemarkRating(value)}
              precision={0.5}
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={handleConfirm}
            variant="info"
          >
            {isLoading ? loadingText : "Mark as done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmAndRemarkDialog;
