// import { useState } from "react";
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
        className="p-0 flex flex-col overflow-hidden"
        aria-describedby="custom-field-dialog-description"
      >
        <DialogHeader className="px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 py-4 pb-4">
          <div className="">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(CustomFieldDialog);
