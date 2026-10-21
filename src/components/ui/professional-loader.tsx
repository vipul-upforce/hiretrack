import React from 'react';
import { cn } from '@/lib/utils';
import UniqueLoading from './morph-loading';

interface ProfessionalLoaderProps {
  /**
   * Size variant of the loader
   * @default "default"
   */
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full';
  /**
   * Text to display below the loader
   */
  text?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show in fullscreen overlay mode
   */
  fullscreen?: boolean;
  /**
   * Custom color for the loader (uses portal primary by default)
   */
}

/**
 * Professional loading indicator with theme support and portal color integration
 * Replaces mismatched skeleton loaders with a smooth, professional loading experience
 */
export function ProfessionalLoader({
  size = 'default',
  text,
  className,
  fullscreen = false,
}: ProfessionalLoaderProps) {
  // Map sizes to UniqueLoading sizes
  let morphSize: 'sm' | 'md' | 'lg';
  if (size === 'sm' || size === 'default') {
    morphSize = 'sm';
  } else if (size === 'lg' || size === 'xl') {
    morphSize = 'md';
  } else {
    morphSize = 'lg';
  }

  const loader = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullscreen && 'min-h-screen',
        className,
      )}
    >
      <UniqueLoading variant="morph" size={morphSize} />

      {/* Loading text */}
      {text && (
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {loader}
      </div>
    );
  }

  return loader;
}

/**
 * Card loader - for replacing skeleton cards
 */
export function CardLoader({
  count = 1,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={`card-loader-${i}`} className="rounded-lg border bg-card p-6">
          <div className="flex h-40 items-center justify-center">
            <UniqueLoading variant="morph" size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table loader - for data tables
 */
export function TableLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={`table-loader-row-${i}`}
          className="flex items-center gap-4 rounded-lg border bg-card p-4"
        >
          <div className="flex flex-1 justify-center">
            <UniqueLoading variant="morph" size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Page loader - full page loading state
 */
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ProfessionalLoader size="lg" text={text} />
    </div>
  );
}

/**
 * Inline loader - for buttons and small spaces
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <UniqueLoading
      variant="morph"
      size="sm"
      className={cn('h-8 w-8', className)}
    />
  );
}

/**
 * Content loader - replaces skeleton content with loading state
 */
export function ContentLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <UniqueLoading variant="morph" size="md" />
    </div>
  );
}

// Export all loaders
export default ProfessionalLoader;
