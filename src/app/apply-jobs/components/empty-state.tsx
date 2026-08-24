'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface EmptyStateProps {
  title: string;
  description?: string;
  imageUrl?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function EmptyState({
  title,
  description,
  imageUrl,
  onBack,
  showBackButton = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${imageUrl ? 'max-sm:pt-2 py-10' : 'py-28'}`}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          width={350}
          height={350}
          className="mb-6"
        />
      )}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
          {description}
        </p>
      )}
      {showBackButton && onBack && (
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center gap-2 bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Jobs
        </Button>
      )}
    </div>
  );
}
