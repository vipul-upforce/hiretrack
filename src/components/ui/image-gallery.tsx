'use client';

import * as React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';

interface Image {
  id: string;
  url: string;
  name: string;
}

interface ImageGalleryProps {
  images: Image[];
  maxPreview?: number;
}

export function ImageGallery({ images, maxPreview = 3 }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState<Image | null>(null);
  const [showAll, setShowAll] = React.useState(false);

  const previewImages = images.slice(0, maxPreview);
  const hasMore = images.length > maxPreview;

  return (
    <>
      <div className="mt-2 flex gap-2">
        {previewImages.map((image) =>
          image.url === '' ? null : (
            <div
              key={image.id}
              role="button"
              tabIndex={0}
              aria-label={`View ${image.name}`}
              className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setSelectedImage(image)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedImage(image);
                }
              }}
            >
              <Image
                src={image.url || ''}
                alt={image.name}
                fill
                className="object-cover"
              />
            </div>
          ),
        )}
        {hasMore && (
          <Button
            variant="outline"
            className="h-20 w-20"
            onClick={() => setShowAll(true)}
          >
            +{images.length - maxPreview} more
          </Button>
        )}
      </div>

      {/* Single Image Preview */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="sr-only break-words">
              Image Preview
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative aspect-[4/3] w-full">
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

      {/* All Images Gallery */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="sr-only break-words">
              Image Gallery
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[80vh] grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3">
            {images.map((image) =>
              image.url === '' ? null : (
                <div
                  key={image.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${image.name}`}
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => {
                    setShowAll(false);
                    setSelectedImage(image);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowAll(false);
                      setSelectedImage(image);
                    }
                  }}
                >
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
