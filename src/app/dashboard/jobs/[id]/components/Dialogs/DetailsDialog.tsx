'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';
import { useIsDesktop } from '@/hooks/useIsDesktop';

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
  const isDesktop = useIsDesktop();
  const [isMaximized, setIsMaximized] = useState(false);

  // Reset maximize state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsMaximized(false);
    }
  }, [open]);

  // Determine dialog mode: fullscreen if mobile/tablet OR if maximized, modal if desktop and not maximized
  const isFullscreen = !isDesktop || isMaximized;
  const dialogClassName = isFullscreen
    ? 'dialog-fullscreen-mode flex flex-col overflow-hidden'
    : 'dialog-modal-mode xl-max-w-50vw flex flex-col overflow-hidden';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={className || dialogClassName}
        data-fullscreen={isFullscreen ? 'true' : 'false'}
      >
        <div className="sr-only">
          <DialogTitle>Details</DialogTitle>
        </div>
        {/* Maximize/Minimize Button - Only show on desktop */}
        {isDesktop && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-10 top-2 z-[100] h-7 w-7 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize className="h-3 w-3" />
            ) : (
              <Maximize className="h-3 w-3" />
            )}
          </Button>
        )}
        {isFullscreen ? (
          <div
            className="flex h-full flex-col"
            style={{ height: '100dvh', minHeight: '100dvh' }}
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
