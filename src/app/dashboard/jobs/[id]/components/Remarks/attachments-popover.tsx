import React, { useState } from 'react';
import Image from 'next/image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileIcon, Folder } from 'lucide-react';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import { Button } from '@/components/ui/button';

interface Image {
  id: string;
  url: string;
  name: string;
}

function AttachmentsPopover({
  attachments,
  onMoreClick,
}: {
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    base64?: string;
    type: string;
    size: number;
  }>;
  onMoreClick: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedImage, setSelectedImage] = React.useState<Image | null>(null);

  const visibleAttachments = attachments.slice(0, visibleCount);
  const hasMore = attachments.length > visibleCount;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          {attachments.length === 0 ? (
            ' '
          ) : (
            <Button
              onClick={(e) => e.stopPropagation()}
              variant="secondary"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent hover:text-accent-foreground focus:z-10 focus:ring-4 focus:outline-none focus:ring-ring focus:text-accent-foreground"
            >
              {attachments.length === 1
                ? '1 Attachment'
                : `${attachments.length} Attachments`}
              <Folder className="h-4 w-4 ml-1" />
            </Button>
          )}
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-4 max-h-[70vh] overflow-y-auto focus:outline-none"
          side="bottom"
          align="start"
          avoidCollisions={false}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <h4 className="font-medium">Attachments</h4>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {visibleAttachments.map((file) => {
                  // debugger;
                  const fileExtension = file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase();
                  const isImage = [
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'webp',
                  ].includes(fileExtension || '');
                  const isPDF = fileExtension === 'pdf';

                  return isPDF ? (
                    <PDFViewer key={file.id} files={[file]} />
                  ) : (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <FileIcon className="h-4 w-4" />
                        <div className="flex flex-col w-full">
                          <span className="text-sm w-full text-wrap break-all">
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (
                            {(file.size / 1024).toFixed(1)}
                            {' '}
                            KB)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isImage ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedImage(file);
                            }}
                            className="text-xs text-blue-500 hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        ) : (
                          <a
                            href={file.url || file.base64}
                            download={file.name}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={() => {
                      setVisibleCount((prev) => prev + 6);
                      onMoreClick();
                    }}
                    className="w-full text-xs text-blue-500 hover:underline"
                  >
                    Load More
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No Attachments</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => {
          if (!open) setSelectedImage(null);
        }}
      >
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="break-words sr-only">
              Image Preview
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full aspect-[4/3]">
              <Image
                src={selectedImage.url}
                alt={selectedImage.name}
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AttachmentsPopover;
