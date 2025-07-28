// import { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { CustomFieldDialogProps } from "../../Types";
import React from "react";

function CustomFieldDialog({
  isOpen,
  onClose,
  title,
  children,
  regular = false,
  modal = true,
}: CustomFieldDialogProps) {
  console.log('CustomFieldDialog props:', { isOpen, title, regular, modal, hasChildren: !!children });
  
  return (
    <div>
      <Dialog open={isOpen} onOpenChange={onClose} modal={modal}>
        <DialogContent
          className={`${
            !regular ? "sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh]" : ""
          } p-0 flex flex-col bg-white dark:bg-black border dark:border-gray-800`}
          aria-describedby="custom-field-dialog-description"
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-gray-700">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-4 pb-6">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default React.memo(CustomFieldDialog);
