import { Skeleton } from '@/components/ui/skeleton';

export default function CaptchaSkeleton() {
  return (
    <div className="px-6 py-4 space-y-6 animate-in fade-in duration-200">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
