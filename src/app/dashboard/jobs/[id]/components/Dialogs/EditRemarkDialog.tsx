import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppSelector } from '@/lib/redux/hooks';
import Rating from '@mui/material/Rating';
import { IEditRemark } from '../../schemas/EditRemarkDialog';

function EditRemarkDialog({
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
  setEditingRemark: (remark: IEditRemark) => void;
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
  ) => void;
  isLoading: boolean;
  setRemarkRating: (x: number | null) => void;
  setRemarkRatingHistory: (x: number | null) => void;
}) {
  const { user } = useAppSelector((state) => state.auth || {});

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
          <DialogTitle className="p-0">Edit Remark</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <MentionTextarea
            className="min-h-[120px] resize-none focus-visible:ring-offset-1"
            placeholder="Enter your remark here... (Alt+Enter to save)"
            value={editingRemark?.description || ''}
            onChange={(input) => {
              const trimmed = input.trim();

              // Disallow null/empty/whitespace-only input
              if (trimmed === '') return;

              setEditingRemark({
                id: editingRemark?.id || '',
                rating: editingRemark?.rating,
                isPrivate: editingRemark?.isPrivate || false,
                description: input, // store original input, not trimmed
              });
            }}
            onKeyDown={(e) => {
              if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                if (editingRemark?.description?.trim() && !isLoading) {
                  handleRemarkUpdate(
                    editingRemark?.id || '',
                    editingRemark?.description || '',
                    editingRemark?.isPrivate,
                  );
                  setIsEditRemarkDialogOpen(false);
                }
              }
            }}
            organizationId={String(user?.organizationId) || ''}
            currentUserRole={user?.role || ''}
            rows={5}
            isRemarkPrivate={editingRemark?.isPrivate ?? true}
          />
          <div className="mt-2 flex items-center gap-2">
            <Label htmlFor="rating">Rating:</Label>
            <Rating
              name="half-rating"
              onChange={(_event, value) => {
                setRemarkRating(value || null);
                setRemarkRatingHistory(value || null);
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
            variant="primary"
            onClick={() => {
              handleRemarkUpdate(
                editingRemark?.id || '',
                editingRemark?.description || '',
                editingRemark?.isPrivate,
              );
              setIsEditRemarkDialogOpen(false);
            }}
          >
            {isLoading ? 'Marking as done...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditRemarkDialog;
