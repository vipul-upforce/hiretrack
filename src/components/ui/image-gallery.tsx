'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './dialog';
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
      <div className="flex gap-2 mt-2">
        {previewImages.map((image) => (image.url === '' ? null : (
          <div
            key={image.id}
            className="relative w-20 h-20 rounded-md overflow-hidden cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={image.url || ''}
              alt={image.name}
              // fill
              className="object-cover"
            />
          </div>
        )))}
        {hasMore && (
          <Button
            variant="outline"
            className="w-20 h-20"
            onClick={() => setShowAll(true)}
          >
            +
            {images.length - maxPreview}
            {' '}
            more
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

      {/* All Images Gallery */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="break-words sr-only">
              Image Gallery
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[80vh]">
            {images.map((image) => (image.url === '' ? null : (
              <div
                key={image.id}
                className="relative aspect-square rounded-md overflow-hidden cursor-pointer"
                onClick={() => {
                  setShowAll(false);
                  setSelectedImage(image);
                }}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="object-cover w-full h-full object-contain"
                />
              </div>
            )))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
