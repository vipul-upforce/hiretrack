import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Rating from '@mui/material/Rating';

function ConfirmAndRemarkDialog({
  isOpen,
  setIsOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  loadingText = 'Marking as done...',
  message,
  title = 'Mark as Done',
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
}) {
  const { user } = useSelector((state: any) => state.auth || {});

  // Local state for the form
  const [remarkDescription, setRemarkDescription] = useState('');
  const [remarkRating, setRemarkRating] = useState<number | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRemarkDescription('');
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
    onConfirm(remarkDescription.trim(), remarkRating);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="p-0 gap-0 overflow-visible flex flex-col"
        size="lg"
      >
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="remark-textarea">Remark</Label>
            <MentionTextarea
              className="min-h-[120px] resize-none focus-visible:ring-offset-1"
              placeholder="Enter your remark here... (Alt+Enter to confirm)"
              value={remarkDescription}
              onChange={setRemarkDescription}
              onKeyDown={(e) => {
                if (e.altKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              organizationId={user?.organizationId || ''}
              currentUserRole={user?.role || ''}
              rows={5}
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

        <DialogFooter className="px-6 py-4 bg-background border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button disabled={isLoading} onClick={handleConfirm} variant="info">
            {isLoading ? loadingText : 'Mark as done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmAndRemarkDialog;
