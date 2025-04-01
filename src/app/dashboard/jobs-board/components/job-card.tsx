'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageGallery } from '@/components/ui/image-gallery';
import { Job } from '@/types/job';

interface JobCardProps {
  job: Job;
  onClick: () => void;
  dragHandleProps: any; // Temporarily use any until we need more specific types
}

export function JobCard({ job, onClick, ...dragHandleProps }: JobCardProps) {
  return (
    <div
      {...dragHandleProps}
      className="bg-card border rounded-lg p-3 text-wrap break-words shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <h3 className="font-medium ">{job.title}</h3>
      {/* <p className="text-sm text-muted-foreground">{job.company}</p> */}
      <div className='flex flex-wrap'>
        {job.attachments.images.length > 0 && (
          <ImageGallery images={job.attachments.images} />
        )}
      </div>
    </div>
  );
} 