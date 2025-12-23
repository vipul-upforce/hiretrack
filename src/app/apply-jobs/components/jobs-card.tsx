'use client';

import type React from 'react';
import { Briefcase, ChevronRight } from 'lucide-react';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { CustomField, FormObject } from '@/Custom_Fields/Types/CustomField';
import CustomFieldBadge from '../../dashboard/jobs/[id]/components/Candidate/CustomFieldBadge';

interface JobCardProps {
  job: {
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
  };
  primaryColor: string;
  formNameObject: FormObject | undefined;
  onClick: () => void;
}

export function JobCard({
  job,
  primaryColor,
  formNameObject,
  onClick,
}: JobCardProps) {
  const customFieldsToShow = job?.customFields
    ? Object.entries(job.customFields).filter(([key, value]) => {
        const field = formNameObject?.fields.find(
          (f: CustomField) => f.label === key,
        );
        if (field?.jobId && field.jobId !== job?._id) return false;
        if (
          (typeof value === 'string' && value === '') ||
          (typeof value === 'object' && Object.keys(value).length === 0)
        ) {
          return false;
        }
        return field?.showOnCard;
      })
    : [];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details and apply for ${job.title}`}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 transition-shadow duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-700 dark:bg-black dark:focus:ring-gray-500"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-full flex-col">
        {/* Header section */}
        <div className="mb-4 flex-1">
          <div className="mb-3 flex items-start justify-between">
            <h2 className="line-clamp-2 text-xl font-bold leading-tight text-gray-900 dark:text-white">
              {job.title}
            </h2>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>

          <div
            className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: job?.description || 'No description found',
            }}
          />

          {/* Skills badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            {job.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${primaryColor}10`,
                  color: primaryColor,
                  borderColor: `${primaryColor}30`,
                }}
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="rounded-full border border-gray-300 bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200">
                +{job.skills.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Footer section */}
        <div className="space-y-3">
          {/* Experience and Salary row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Briefcase className="h-4 w-4" />
              <span className="font-medium">{job.experience} years exp</span>
            </div>

            {job.salary && job.salary.inText && (
              <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <span className="flex h-4 w-4 items-center justify-center text-sm font-semibold">
                  ₹
                </span>
                {job.salary?.inText || job.salary?.inText === '' ? (
                  <span className="text-sm font-semibold">
                    {job.salary.inText}
                  </span>
                ) : (
                  <span className="text-sm font-semibold">
                    {job.salary?.min &&
                      job.salary.min !== 0 &&
                      `${job.salary.min}`}
                    {job.salary?.min &&
                      job.salary.min !== 0 &&
                      job.salary?.max &&
                      job.salary.max !== 0 &&
                      '-'}
                    {job.salary?.max &&
                      job.salary.max !== 0 &&
                      `${job.salary.max}`}
                    {(job.salary?.min || job.salary?.max) && ' LPA'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Custom fields */}
          {customFieldsToShow.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              {customFieldsToShow.map(([key, value]) => (
                <div key={key.toString()}>
                  <CustomFieldBadge kii={key} value={value} />
                </div>
              ))}
            </div>
          )}

          {/* Apply indicator */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Click to view details & apply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
