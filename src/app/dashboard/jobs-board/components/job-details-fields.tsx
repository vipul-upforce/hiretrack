"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link, Clock, Lock } from "lucide-react";
import { ImageGallery } from "@/components/ui/image-gallery";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { FileAttachment } from "./FileAttchment";
import ExpandableDescription from "../../jobs/[id]/components/Utils/expand-collapse-desc";
import CustomFieldsData from "../../../../Custom_Fields/Components/CustomFields/customFields-details";
import { Job } from "@/types/job";
import React from "react";

interface FieldConfig {
  label: string;
  render: (job: Job) => React.ReactNode | null;
  shouldRender?: (job: Job) => boolean;
}

export const jobDetailsFields: FieldConfig[] = [
  {
    label: "Job Title",
    render: (job) => <div className="text-sm break-words">{job.title}</div>,
  },
  {
    label: "Job Description",
    render: (job) => (
      <div className="text-sm break-words whitespace-pre-wrap">
        {job.description || "No description Found"}
      </div>
    ),
  },
  {
    label: "Required Skills",
    render: (job) => (
      <div className="flex flex-wrap gap-2">
        {job.skills.map((skill, skillIndex) => (
          <Badge
            key={`${job._id}-skill-${skillIndex}-${skill}`}
            variant="secondary"
          >
            {skill}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    label: "Job Links",
    render: (job) => (
      <div className="space-y-2">
        {job.links.map((link, index) => (
          <a
            key={index}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm flex items-center gap-2 text-blue-500 hover:underline group"
            title={link}
          >
            <Link className="h-4 w-4 flex-shrink-0" />
            <span className="truncate group-hover:whitespace-normal">
              {link}
            </span>
          </a>
        ))}
      </div>
    ),
    shouldRender: (job) => job.links.length > 0,
  },
  {
    label: "Salary",
    render: (job) => (
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {job.salary?.inText ? (
            <span className="text-sm font-medium">{job.salary.inText}</span>
          ) : (
            <>
              {job.salary?.min && job.salary.min !== 0 && (
                <span className="text-sm font-medium">
                  {job.salary.min} LPA
                </span>
              )}
              {job.salary?.min &&
                job.salary.min !== 0 &&
                job.salary?.max &&
                job.salary.max !== 0 && (
                  <span className="mx-1 text-muted-foreground">-</span>
                )}
              {job.salary?.max && job.salary.max !== 0 && (
                <span className="text-sm font-medium">
                  {job.salary.max} LPA
                </span>
              )}
            </>
          )}
        </div>

        {job.salary?.isPrivate && (
          <Lock size={12} className="text-muted-foreground" />
        )}
      </div>
    ),
    shouldRender: (job) =>
      job.salary && job.salary.inText && job.salary.inText !== ""
        ? true
        : false,
  },
  {
    label: "Experience Required",
    render: (job) => (
      <div className="text-sm">
        {job.experience} {job.experience === 1 ? "year" : "years"}
      </div>
    ),
  },
  {
    label: "Images",
    render: (job) => (
      <div className="flex flex-wrap">
        <ImageGallery images={job.attachments.images} />
      </div>
    ),
    shouldRender: (job) => job.attachments.images.length > 0,
  },
  {
    label: "Attachments",
    render: (job) => (
      <>
        <div className="flex gap-2 flex-wrap">
          <ImageGallery
            images={job.attachments.files.filter((file) => {
              const fileExtension = file.name.split(".").pop()?.toLowerCase();
              return ["jpg", "jpeg", "png", "gif", "webp"].includes(
                fileExtension || ""
              );
            })}
          />
        </div>
        {job.attachments.files
          .filter((file) => {
            const fileExtension = file.name.split(".").pop()?.toLowerCase();
            return fileExtension === "pdf";
          })
          .map((file) => (
            <PDFViewer key={file.name} files={[file]} />
          ))}
        {job.attachments.files
          .filter((file) => {
            const fileExtension = file.name.split(".").pop()?.toLowerCase();
            return !["jpg", "jpeg", "png", "gif", "webp", "pdf"].includes(
              fileExtension || ""
            );
          })
          .map((file) => (
            <FileAttachment key={file.name} file={file} />
          ))}
      </>
    ),
    shouldRender: (job) => job.attachments.files?.length > 0,
  },
  {
    label: "Tracking",
    render: (job) => (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <div className="text-sm">
            <span className="text-muted-foreground">Created:</span>{" "}
            {format(new Date(job.tracking.createdAt), "PPP")}
          </div>
        </div>
        {job.tracking.openedAt && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">Opened:</span>{" "}
              {format(new Date(job.tracking.openedAt), "PPP")}
            </div>
          </div>
        )}
        {job.tracking.closedAt && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">Closed:</span>{" "}
              {format(new Date(job.tracking.closedAt), "PPP")}
            </div>
          </div>
        )}
      </div>
    ),
  },
  {
    label: "",
    shouldRender: (job) =>
      job.customFields && Object.keys(job.customFields).length > 0
        ? true
        : false,
    render: (job) => (
      <CustomFieldsData
        customFields={{ customFields: job.customFields || {} } as any}
      />
    ),
  },
];
