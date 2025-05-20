import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ConfirmationDialog = ({
  isOpen,
  setIsOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",

  onConfirm,
  onCancel,
  isLoading = false,
  loadingText = "Processing...",
  className = "sm:max-w-[400px]",
  buttonName = "Confirm",
}: {
  isOpen: boolean;
  setIsOpen: (x: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  buttonName?: string;
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setIsOpen(false);
  };

  const handleConfirm = () => {
    onCancel();
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>{message}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={isLoading} onClick={handleConfirm}>
            {isLoading ? loadingText : buttonName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
