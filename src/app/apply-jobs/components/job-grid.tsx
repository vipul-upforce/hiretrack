'use client';

import { FormObject } from '@/Custom_Fields/Types/CustomField';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { JobCard } from './jobs-card';
import { LoadingSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';

interface ApplyJob {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experience: number;
  salary?: {
    min: number;
    max: number;
    inText: string;
    isPrivate: boolean;
  };
  customFields?: CustomFieldValues;
}

interface JobGridProps {
  jobs: ApplyJob[];
  isLoading: boolean;
  primaryColor: string;
  formNameObject: FormObject | undefined;
  onJobClick: (job: ApplyJob) => void;
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
          showBackButton
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard
          key={job._id}
          job={job}
          primaryColor={primaryColor}
          formNameObject={formNameObject}
          onClick={() => onJobClick(job)}
        />
      ))}
    </div>
  );
}
