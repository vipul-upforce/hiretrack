import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from '@/components/ui/dialog';
import React from 'react';
import { CustomFieldDialogProps } from '../../Types';

function CustomFieldDialog({
  isOpen,
  onClose,
  title,
  children,
  regular = false,
  modal = true,
}: CustomFieldDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={modal}>
      <DialogContent
        size={!regular ? '2xl' : 'lg'}
        className="flex flex-col overflow-hidden p-0"
        aria-describedby="custom-field-dialog-description"
      >
        <DialogHeader className="px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 pb-4">
          <div className="">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(CustomFieldDialog);
