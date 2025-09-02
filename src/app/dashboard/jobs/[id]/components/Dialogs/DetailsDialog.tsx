"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";

interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

export function DetailsDialog({
  open,
  onOpenChange,
  className,
  children,
}: DetailsDialogProps) {
  const [isLargeViewport, setIsLargeViewport] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkViewportSize = () => {
      const isLarge = window.innerWidth >= 1100 && window.innerHeight >= 1100;
      setIsLargeViewport(isLarge);
    };

    // Check initial size
    checkViewportSize();

    // Add event listener for resize
    window.addEventListener("resize", checkViewportSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkViewportSize);
  }, []);

  // Reset maximize state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsMaximized(false);
    }
  }, [open]);

  const dialogClassName =
    isLargeViewport && !isMaximized
      ? "!max-w-[80vw] !min-w-[950px] !h-[90vh] !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] xl:!max-w-[50vw] overflow-hidden flex flex-col"
      : "!max-w-none !w-screen !h-screen !min-h-screen !max-h-screen !left-0 !top-0 !translate-x-0 !translate-y-0 !min-w-0 !inset-0 !m-0 !border-0 !rounded-none overflow-hidden flex flex-col";

  const dialogStyle =
    !isLargeViewport || isMaximized
      ? {
          position: "fixed" as const,
          inset: 0,
          width: "100vw",
          height: "100vh",
          minHeight: "100vh",
          maxHeight: "100vh",
          maxWidth: "none",
          transform: "none",
          left: 0,
          top: 0,
          margin: 0,
          border: 0,
          borderRadius: 0,
        }
      : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={className || dialogClassName}
        style={dialogStyle}
        data-fullscreen={!isLargeViewport || isMaximized ? "true" : "false"}
      >
        <div className="sr-only">
          <DialogTitle>Details</DialogTitle>
        </div>
        {/* Maximize/Minimize Button */}
        {isLargeViewport && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-5 z-50 h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md mr-5"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize className="h-3 w-3" />
            ) : (
              <Maximize className="h-3 w-3" />
            )}
          </Button>
        )}
        {!isLargeViewport || isMaximized ? (
          <div
            className="h-full flex flex-col"
            style={{ height: "100vh", minHeight: "100vh" }}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}
