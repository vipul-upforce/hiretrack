import { Skeleton } from '@/components/ui/skeleton';

export function NotificationSkeleton() {
  return (
    <div className="flex w-full items-start gap-4 border-b p-4 hover:bg-muted/50">
      {/* Left Column: Icon/Avatar */}
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />

      {/* Right Column: Content */}
      <div className="flex flex-1 flex-col gap-1.5">
        {/* Header Row: Title and Timestamp */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-1/3 rounded-md" /> {/* Title */}
          <Skeleton className="h-3 w-12 rounded-md" /> {/* Time */}
        </div>

        {/* Description / Message Body */}
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-5/6 rounded-md" />
        </div>

        {/* Optional: Footer Tags or Action Area */}
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" /> {/* Badge style */}
        </div>
      </div>
    </div>
  );
}
