"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import {
  FileText,
  MapPin,
  Briefcase,
  Clock,
  IndianRupee,
  StarIcon,
  Dot,
  Star,
} from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { Candidate } from "@/types/candidate";
import { CandidateStatusBadge } from "./candidate-status-badge";
import { EditCandidateDialog } from "./edit-candidate-dialog";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  useLazyFetchCandidatesQuery,
  useUpdateCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import CustomFieldsData from "../../../../../Custom_Fields/Components/CustomFields/customFields-details";
import Rating from "@mui/material/Rating";
import { AssignCandidateDialog } from "./assign-candidate-dialog";
import { usePathname } from "next/navigation";
import { ImageGallery } from "@/components/ui/image-gallery";
import AtttachmentsPopover from "./attachments-popover";
import { ICandidateHistory } from "@/lib/models/history";
import ExpandableDescription from "./expand-collapse-desc";
import { AssignJobDialog } from "./assing-job-dialog";

interface CandidateDetailsDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (updatedCandidate: Candidate) => void;
  hideEditButton?: boolean;
  large?: boolean;
  refetchAssignment?: () => void;
  fromFilter?: boolean;
  refetchCandidates?: () => void;
}

const labelClass = "font-semibold text-base";

export const formatDate = (dateString: string | Date | undefined) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (!isValid(date)) return "Invalid date";

  return format(date, "PPP");
};

export const formatTime = (timeString: string | Date | undefined) => {
  if (!timeString) return "N/A";
  const time = new Date(timeString);
  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
  return formattedTime;
};

export function CandidateDetailsDialog({
  candidate,
  isOpen,
  onOpenChange,
  onUpdate,
  hideEditButton = false,
  refetchAssignment,
  fromFilter,
  refetchCandidates,
}: CandidateDetailsDialogProps) {
  const pathname = usePathname();
  const { id } = useParams();

  const [refetchCandidate, { data: candidateData }] = useLazyFetchCandidatesQuery();

  const refetch = async () => {
    await refetchCandidate((id as string) || candidate?.jobId._id || "");
  };

  const [isEditing, setIsEditing] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [updateCandidate] = useUpdateCandidateMutation();
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssigningJob, setIsAssigningJob] = useState(false);
  const user = JSON.parse(Cookies.get("user") || "{}");

  const handleEditClick = () => {
    setIsEditing(true); // Open the edit dialog
    onOpenChange(false); // Close the current dialog
  };

  useEffect(() => {
    return () => {
      setNewRemark("");
      setRemarkRating(0);
    };
  }, []);

  useEffect(() => {
    if (isEditing) {
      onOpenChange(false); // Close the details dialog only when editing starts
    }
  }, [isEditing, onOpenChange]);

  // Add local state to track remarks
  const [localCandidate, setLocalCandidate] = useState<Candidate | null>(
    candidate
  );

  const [timeLineItems, setTimeLineItems] = useState<ICandidateHistory[]>([]);

  useEffect(() => {
    if (candidateData || localCandidate) {
      if (!candidateData && localCandidate) {
        const currentCandidate = localCandidate;
        if (currentCandidate && currentCandidate.history) {
          setTimeLineItems(currentCandidate.history || []);
        }
      } else if (candidateData && localCandidate) {
        const currentCandidate = candidateData.find(
          (c) => c._id === localCandidate._id
        );
        if (currentCandidate && currentCandidate.history) {
          setTimeLineItems(currentCandidate.history || []);
        }
      }
    }
  }, [candidateData, localCandidate]);

  useEffect(() => {
    if (candidate) {
      // debugger
      setLocalCandidate(candidate);
      // if(pathname !== "/dashboard"){
      //   refetch();
      // }
    }
  }, [candidate, id]);

  const handleAddRemark = async () => {
    if (!newRemark.trim() || !user?.id) {
      toast({
        title: "Error",
        description: "Please add remarks",
        variant: "destructive",
      });
      return;
    }

    try {
      const newRemarkObj = {
        description: String(newRemark).trim(),
        date: new Date().toISOString(),
        rating: remarkRating ? Number(remarkRating) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      const updateData = {
        _id: localCandidate?._id,
        remarks: [...(localCandidate?.remarks || []), newRemarkObj],
      };
      const result = await updateCandidate(updateData).unwrap();
      // Update both local and parent state
      setLocalCandidate(result);
      onUpdate?.(result);
      if (pathname === "/dashboard") {
        refetchAssignment?.();
      }
      if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
        refetch();
      }

      setNewRemark("");
      setRemarkRating(null);

      toast({
        title: "Success",
        description: "Remark added successfully",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  if (!localCandidate) return null;

  const validTimeLineItems = timeLineItems.filter((item) => item.title !== "");

  return (
    <>
      <Dialog
        open={isOpen && !isAssigning}
        onOpenChange={(e) => {
          setNewRemark("");
          setRemarkRating(null);
          onOpenChange(e);
        }}
      >
        <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-start">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-semibold">
              Candidate Details
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className={labelClass}>Name</Label>
                <div className="text-sm">{localCandidate.name}</div>
              </div>
              <CandidateStatusBadge status={localCandidate.status} />
            </div>
            <div className="space-y-2"></div>
            {localCandidate.email && (
              <div className="space-y-2 relative">
                <Label className={labelClass}>
                  Email
                </Label>
                <p>{localCandidate.email || ""}</p>
              </div>
            )}
            <div className="space-y-2 relative">
              <Label className={labelClass}>
                {localCandidate.jobId.title ||
                  localCandidate.jobDetails?.title ||
                  "Job Description"}
              </Label>
              <ExpandableDescription
                description={
                  localCandidate.jobId.description ||
                  localCandidate.jobDetails?.description ||
                  "No description Found"
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className={labelClass}>Location</Label>
                <div className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {localCandidate.location}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Experience</Label>
                <div className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {localCandidate.experience} years
                </div>
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Notice Period</Label>
                <div className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {localCandidate.noticePeriod} days
                </div>
              </div>
              {user.role !== "interviewer" && (
                <>
                  <div className="space-y-2">
                    <Label className={labelClass}>Current CTC</Label>
                    <div className="text-sm flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      {localCandidate.currentCTC} LPA
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>Expected CTC</Label>
                    <div className="text-sm flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      {localCandidate.expectedCTC} LPA
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Skills</Label>
              <div className="flex flex-wrap gap-2">
                {localCandidate.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Resume</Label>
              {localCandidate.resume && (
                <PDFViewer files={[localCandidate.resume]} />
              )}
            </div>

            {localCandidate.attachments.length > 0 && (
              <div className="space-y-2">
                <div className="space-y-2 contents">
                  <Label className={labelClass}>Attachments</Label>

                  {/* Filter and render image files */}
                  <div className="flex gap-2 flex-wrap">
                    {/* {localCandidate.attachments
                      .filter((file) => {
                        const fileExtension = file.name
                          .split(".")
                          .pop()
                          ?.toLowerCase();
                        return ["jpg", "jpeg", "png", "gif", "webp"].includes(
                          fileExtension || ""
                        );
                      })
                      .map((file) => (
                        <ImageGallery
                          key={file.name}
                          images={[file]}
                          // maxPreview={3}
                        />
                      ))} */}
                    <ImageGallery
                      images={localCandidate.attachments.filter(file => {
                        const fileExtension = file.name.split('.').pop()?.toLowerCase();
                        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
                      })}
                    // maxPreview={3}
                    />

                  </div>

                  {/* Filter and render PDF files */}
                  {localCandidate.attachments
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
                  {localCandidate.attachments
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
              </div>
            )}

            <div className="space-y-2">
              <Label className={labelClass}>Assignment History</Label>
              <ol className="relative border-s border-gray-200 dark:border-gray-700">
                {validTimeLineItems.length > 0
                  ? validTimeLineItems.reverse().map((interview, i) => {
                    const deadlineDate = formatDate(interview.dateTime);
                    const deadlineTime = formatTime(interview.dateTime);

                    return (
                      <div key={i} className="mb-10 ms-4">
                        <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                        <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500 flex flex-row items-center">
                          {deadlineDate} <Dot /> {deadlineTime}
                        </time>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize flex flex-row itmes-center justify-start">
                          {(interview.title !== "" || !interview.title) &&
                            interview.title !== "Assigned to Job" ? (
                            <div className="flex flex-row items-start justify-between w-full">
                              <div className="flex flex-row">

                                {
                                  interview.previousInterviewer && typeof interview.previousInterviewer ===
                                    "object" &&
                                    "name" in interview.previousInterviewer
                                    ?
                                    <p className="pl-1">
                                      {interview.previousInterviewer.name +
                                        " → "}
                                    </p>
                                    : null}
                                <p className="pl-1">
                                  {interview.currentInterviewer &&
                                    typeof interview.currentInterviewer ===
                                    "object" &&
                                    "name" in interview.currentInterviewer
                                    ? interview.previousInterviewer
                                      ? interview.currentInterviewer.name
                                      : `Assigned to ${interview.currentInterviewer.name}`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <p className="text-xs font-light text-gray-400">
                                  Assigned by
                                </p>
                                <p className="font-light text-gray-500 text-sm">
                                  {interview.assignmentBy &&
                                    typeof interview.assignmentBy ===
                                    "object" &&
                                    "name" in interview.assignmentBy
                                    ? `${interview.assignmentBy.name}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          ) : (
                            interview.title
                          )}
                        </h3>
                        <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400 flex flex-row justify-between w-full text-wrap break-all">
                          <p>
                            {interview.note ? interview.note.description : ""}
                          </p>

                          {interview.note && interview.note.rating !== 0 && (
                            <div className="flex flex-row items-center">
                              {interview.note.rating}/5
                              <Star
                                size={"15px"}
                                className="mt-[1px]"
                                style={{ color: "orange" }}
                              />
                            </div>
                          )}
                        </div>
                        <AtttachmentsPopover
                          attachments={interview.attachments}
                          onMoreClick={() => null}
                        />
                      </div>
                    );
                  })
                  : "No Assignment History Found"}
              </ol>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Status History</Label>
              <div className="space-y-2">
                <div className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    Created: {formatDate(localCandidate.tracking?.createdAt)}
                  </span>
                </div>
                {localCandidate.tracking?.assignedToJobDate && (
                  <div className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>
                      Job Assigned:{" "}
                      {formatDate(localCandidate.tracking?.assignedToJobDate)}
                    </span>
                  </div>
                )}
                <div className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    Last Updated:{" "}
                    {formatDate(localCandidate.tracking?.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assignment Management */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Interview Assignment</h3>
              {localCandidate?.assignment ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>
                      Interviewer:{" "}
                      {typeof localCandidate.assignment.interviewerId ===
                        "object" && localCandidate.assignment.interviewerId
                        ? localCandidate.assignment.interviewerId.name
                        : "Unknown"}
                    </span>
                  </div>
                  <div>
                    Interview Date:{" "}
                    {formatDate(localCandidate.assignment.deadline)} on{" "}
                    {formatTime(localCandidate.assignment.deadline)}
                  </div>
                </div>
              ) : (
                <div>Not assigned to any interviewer</div>
              )}
            </div>

            {/* Remarks Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Interview Remarks</h3>
              <div className="space-y-4">
                {localCandidate?.remarks &&
                  localCandidate.remarks.length > 0 ? (
                  localCandidate.remarks.map((remark) => (
                    <div
                      key={remark.date}
                      className="border rounded-lg p-4 mb-4"
                    >
                      <div className="flex justify-between items-start mb-2 break-all text-wrap">
                        <p className="text-sm">{remark.description}</p>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="capitalize">
                            {remark.userId?.name} at &nbsp;
                          </span>
                          <span>{formatDate(remark.date)}</span>
                        </div>
                        <Rating
                          name="text-feedback"
                          value={remark.rating}
                          readOnly
                          precision={0.5}
                          emptyIcon={
                            <StarIcon
                              style={{ opacity: 0.55 }}
                              fontSize="inherit"
                            />
                          }
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No remarks yet
                  </div>
                )}
              </div>

              {/* Add New Remark */}
              <div className="space-y-4">
                <Textarea
                  placeholder="Add a remark..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rating">Rating:</Label>
                    <Rating
                      name="half-rating"
                      onChange={(e, value) => {
                        setRemarkRating(value ? value : null);
                      }}
                      defaultValue={0}
                      precision={0.5}
                    />
                  </div>
                  <Button onClick={handleAddRemark}>Add Remark</Button>
                </div>
              </div>
              <CustomFieldsData
                customFields={localCandidate?.customFields || {}}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4">
            {!fromFilter ? (
              <>
                <Button onClick={() => setIsAssigning(true)}>Assign</Button>
                {!hideEditButton && (
                  <Button onClick={handleEditClick}>Edit</Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    setNewRemark("");
                    setRemarkRating(null);
                  }}
                >
                  Close
                </Button>
              </>
            ) : (
              <div>
                <Button onClick={() => setIsAssigningJob(true)}>
                  Assign Job
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {isAssigning && localCandidate && (
        <AssignCandidateDialog
          candidate={localCandidate}
          refetch={refetch}
          isOpen={isAssigning}
          onOpenChange={setIsAssigning}
          onUpdate={onUpdate || (() => { })}
          setLocalCandidate={setLocalCandidate}
          refetchAssignment={refetchAssignment}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
      {isAssigningJob && localCandidate && (
        <AssignJobDialog
          candidate={localCandidate}
          isOpen={isAssigningJob}
          onOpenChange={setIsAssigningJob}
          onJobAssignment={() => {
            refetchCandidates?.();
            onOpenChange(false);
            setIsAssigningJob(false);
          }}
        />
      )}
      {isEditing && localCandidate && (
        <EditCandidateDialog
          candidate={localCandidate}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onUpdate={onUpdate || (() => { })}
          refetchAssignment={refetchAssignment}
          onSuccess={() => {
            refetch();
          }}
          reopenDetailsDialog={() => {
            onOpenChange(true);
          }}
        />
      )}
    </>
  );
}
