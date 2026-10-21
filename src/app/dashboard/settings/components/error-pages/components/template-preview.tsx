'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TemplatePreviewProps {
  html: string;
  title: string;
}

export function TemplatePreview({ html, title }: TemplatePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Live Preview</p>
            <p className="text-xs text-muted-foreground">
              This matches what Nginx will serve.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
          >
            Full screen
          </Button>
        </div>
        <div className="flex-1 bg-muted/30">
          <iframe
            title={title}
            className="h-full w-full border-0"
            srcDoc={html}
            sandbox=""
          />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex h-[90vh]  min-w-[60vw] max-w-[80vw] flex-col overflow-hidden bg-muted/40 p-0">
          <DialogHeader className="px-4 py-3">
            <DialogTitle className='text-sm'>Full Screen Preview</DialogTitle>
          </DialogHeader>
          <iframe
            title={`${title} full screen`}
            className="h-full w-full border-0"
            srcDoc={html}
            sandbox=""
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
