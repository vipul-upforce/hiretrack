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
  return (
    <div>
        <Dialog open={isOpen} onOpenChange={onClose} modal={modal}>
        <DialogContent
          className={`${
            !regular ? "sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh]" : ""
          } p-6 flex flex-col overflow-y-auto`}
          aria-describedby="custom-field-dialog-description"
        >
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default React.memo(CustomFieldDialog);
