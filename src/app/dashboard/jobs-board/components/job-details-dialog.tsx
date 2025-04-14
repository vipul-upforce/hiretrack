"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EditJobForm } from "./edit-job-form";
import { format } from "date-fns";
// import { Link, Calendar, Briefcase, Clock } from "lucide-react";
import { Link, Clock } from "lucide-react";
import { ImageGallery } from "@/components/ui/image-gallery";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { Job } from "@/types/job";
import CustomFieldsData from "../../../../Custom_Fields/Components/CustomFields/customFields-details";
import ExpandableDescription from "../../jobs/[id]/components/expand-collapse-desc";

interface JobDetailsDialogProps {
  job: Job | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  onJobUpdate: (job: Job) => void;
}

const labelClass = "font-semibold text-base";

export function JobDetailsDialog({
  job,
  isOpen,
  onOpenChange,
  userRole,
  onJobUpdate,
}: JobDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = userRole === "hr" || userRole === "admin";

  if (!job) return null;

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-center">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold">
            Job Details
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <EditJobForm
            job={job}
            onSave={(updatedJob) => {
              onJobUpdate?.(updatedJob);
              setIsEditing(false);
              onOpenChange(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="flex flex-col h-[calc(90vh-80px)] overflow-hidden flex flex-col justify-center">
            <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-6">
              <div className="space-y-2">
                <Label className={labelClass}>Job Title</Label>
                <div className="text-sm break-words">{job.title}</div>
              </div>

              {/* <div className="space-y-2">
                <Label className={labelClass}>Company</Label>
                <div className="text-sm flex items-center gap-2 break-words">
                  <Briefcase className="h-4 w-4 flex-shrink-0" />
                  {job.company}
                </div>
              </div> */}

              <div className="space-y-4 relative">
                <Label className="font-semibold text-lg">Job Description</Label>
                <ExpandableDescription
                  description={job.description || "No description Found"}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className={labelClass}>Required Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <Label className={labelClass}>Valid Till</Label>
                  <div className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    {format(new Date(job.validTill), "PPP")}
                  </div>
                </div> */}

                {job.links.length > 0 && (
                  <div className="space-y-2">
                    <Label className={labelClass}>Job Links</Label>
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
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Experience Required</Label>
                <div className="text-sm">
                  {job.experience} {job.experience === 1 ? "year" : "years"}
                </div>
              </div>

              {job.attachments.images.length > 0 && (
                <div className="space-y-2 flex flex-wrap">
                  <Label className={labelClass}>Images</Label>
                  <ImageGallery
                    images={job.attachments.images}
                    // maxPreview={3}
                  />
                </div>
              )}

              {job.attachments.files?.length > 0 && (
                <div className="space-y-2">
                  <Label className={labelClass}>Attachments</Label>

                  {/* Filter and render image files */}
                  <div className="flex gap-2 flex flex-wrap">
                    <ImageGallery
                      images={job.attachments.files.filter((file) => {
                        const fileExtension = file.name
                          .split(".")
                          .pop()
                          ?.toLowerCase();
                        return ["jpg", "jpeg", "png", "gif", "webp"].includes(
                          fileExtension || ""
                        );
                      })}
                      // maxPreview={3}
                    />
                  </div>

                  {/* Filter and render PDF files */}
                  {job.attachments.files
                    .filter((file) => {
                      const fileExtension = file.name
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      return fileExtension === "pdf";
                    })
                    .map((file) => (
                      <PDFViewer key={file.name} files={[file]} />
                    ))}

                  {/* Render UI for other file types */}
                  {job.attachments.files
                    .filter((file) => {
                      const fileExtension = file.name
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      return ![
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "webp",
                        "pdf",
                      ].includes(fileExtension || "");
                    })
                    .map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-grey-100 rounded-md">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Download
                        </a>
                      </div>
                    ))}
                </div>
              )}

              <div className="space-y-2">
                <Label className={labelClass}>Tracking</Label>
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
                <div>
                  <CustomFieldsData customFields={job.customFields} />
                </div>
              </div>
            </div>
            {canEdit && (
              <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>Edit Job</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
