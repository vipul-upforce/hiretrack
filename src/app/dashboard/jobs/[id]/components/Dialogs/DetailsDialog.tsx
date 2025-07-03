"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

export function DetailsDialog({
  open,
  onOpenChange,
  className = "sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-center",
  children,
}: DetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <div className="hidden">
          <DialogTitle></DialogTitle>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
