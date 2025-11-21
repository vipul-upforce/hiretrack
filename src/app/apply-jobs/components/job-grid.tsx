"use client";

import { JobCard } from "./jobs-card";
import { LoadingSkeleton } from "./loading-skeleton";
import { EmptyState } from "./empty-state";

interface JobGridProps {
  jobs: any[];
  isLoading: boolean;
  primaryColor: string;
  formNameObject: any;
  onJobClick: (job: any) => void;
  hasSearch: boolean;
  onClearSearch?: () => void;
}

export function JobGrid({
  jobs,
  isLoading,
  primaryColor,
  formNameObject,
  onJobClick,
  hasSearch,
  onClearSearch,
}: JobGridProps) {
  if (isLoading) {
    return <LoadingSkeleton count={6} />;
  }

  if (jobs && jobs.length === 0) {
    if (hasSearch) {
      return (
        <EmptyState
          title="No Jobs Found"
          description="Try adjusting your search terms or browse all available positions"
          imageUrl="/notfound.jpg"
          onBack={onClearSearch}
          showBackButton={true}
        />
      );
    }
    return (
      <EmptyState
        title="No Jobs Available"
        description="Check back later for new opportunities"
        imageUrl="/notfound.jpg"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job, index) => (
        <JobCard
          key={index}
          job={job}
          primaryColor={primaryColor}
          formNameObject={formNameObject}
          onClick={() => onJobClick(job)}
        />
      ))}
    </div>
  );
}
