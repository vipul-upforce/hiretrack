"use client";
import { Briefcase, ChevronRight } from "lucide-react";
import CustomFieldBadge from "../../dashboard/jobs/[id]/components/Candidate/CustomFieldBadge";

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
    customFields?: Record<string, any>;
  };
  primaryColor: string;
  formNameObject: any;
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
        const field = formNameObject?.fields.find((f: any) => f.label === key);
        if (field?.jobId && field.jobId !== job?._id) return false;
        if (
          (typeof value === "string" && value === "") ||
          (typeof value === "object" && Object.keys(value).length === 0)
        ) {
          return false;
        }
        return field?.showOnCard;
      })
    : [];

  return (
    <div
      className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Header section */}
        <div className="flex-1 mb-4">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
              {job.title}
            </h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          <div
            className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4"
            dangerouslySetInnerHTML={{
              __html: job?.description || "No description found",
            }}
          />

          {/* Skills badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs font-medium rounded-full border"
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
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-500">
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
              <Briefcase className="w-4 h-4" />
              <span className="font-medium">{job.experience} years exp</span>
            </div>

            {job.salary && job.salary.inText && (
              <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <span className="w-4 h-4 flex items-center justify-center text-sm font-semibold">
                  ₹
                </span>
                {job.salary?.inText || job.salary?.inText === "" ? (
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
                      "-"}
                    {job.salary?.max &&
                      job.salary.max !== 0 &&
                      `${job.salary.max}`}
                    {(job.salary?.min || job.salary?.max) && " LPA"}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Custom fields */}
          {customFieldsToShow.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {customFieldsToShow.map(([key, value], i) => (
                <div key={i}>
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
