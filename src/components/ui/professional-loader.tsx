import React from "react";
import { cn } from "@/lib/utils";
import UniqueLoading from "./morph-loading";

interface ProfessionalLoaderProps {
  /**
   * Size variant of the loader
   * @default "default"
   */
  size?: "sm" | "default" | "lg" | "xl" | "full";
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
  variant?: "primary" | "secondary" | "muted";
}

/**
 * Professional loading indicator with theme support and portal color integration
 * Replaces mismatched skeleton loaders with a smooth, professional loading experience
 */
export function ProfessionalLoader({
  size = "default",
  text,
  className,
  fullscreen = false,
  variant = "primary",
}: ProfessionalLoaderProps) {
  // Map sizes to UniqueLoading sizes
  const morphSize = size === "sm" || size === "default" ? "sm" : size === "lg" || size === "xl" ? "md" : "lg";

  const loader = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullscreen && "min-h-screen",
        className
      )}
    >
      <UniqueLoading variant="morph" size={morphSize} />

      {/* Loading text */}
      {text && (
        <p className="text-sm font-medium text-muted-foreground">
          {text}
        </p>
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
    <div className={cn("flex flex-col gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-6"
        >
          <div className="flex items-center justify-center h-40">
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
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border bg-card"
        >
          <div className="flex-1 flex justify-center">
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
export function PageLoader({
  text = "Loading...",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <ProfessionalLoader size="lg" text={text} />
    </div>
  );
}

/**
 * Inline loader - for buttons and small spaces
 */
export function InlineLoader({
  className,
}: {
  className?: string;
}) {
  return (
    <UniqueLoading variant="morph" size="sm" className={cn("w-8 h-8", className)} />
  );
}

/**
 * Content loader - replaces skeleton content with loading state
 */
export function ContentLoader({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <UniqueLoading variant="morph" size="md" />
    </div>
  );
}

// Export all loaders
export default ProfessionalLoader;
