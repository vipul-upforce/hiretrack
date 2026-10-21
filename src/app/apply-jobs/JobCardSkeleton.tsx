import { ProfessionalLoader } from '@/components/ui/professional-loader';

export function JobCardSkeleton() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <ProfessionalLoader size="lg" text="Loading..." />
    </div>
  );
}
