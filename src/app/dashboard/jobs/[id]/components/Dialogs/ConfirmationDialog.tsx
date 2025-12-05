import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ConfirmationDialog({
  isOpen,
  setIsOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',

  onConfirm,
  onCancel,
  isLoading = false,
  loadingText = 'Processing...',
  className = 'sm:max-w-[400px]',
  buttonName = 'Confirm',
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
}) {
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
      <DialogContent className={`${className} p-0 overflow-hidden flex flex-col`}>
        <DialogHeader className="px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p>{message}</p>
        </div>
        <DialogFooter className="border-t bg-background px-6 py-4 sticky bottom-0 z-10">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={handleConfirm}
            variant="primary"
            className={
              buttonName === 'Archive'
                ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600'
                : ''
            }
          >
            {isLoading ? loadingText : buttonName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmationDialog;
