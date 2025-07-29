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
  className = "!max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[80vw] lg:!min-w-[950px] lg:!h-[90vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[50vw] p-0 overflow-hidden flex flex-col",
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
