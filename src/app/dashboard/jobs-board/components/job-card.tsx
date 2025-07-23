"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Trash2,
  ArchiveRestore,
  MinusCircleIcon,
  Copy,
  Layout,
  MoreHorizontal,
  Edit,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmationDialog from "../../jobs/[id]/components/Dialogs/ConfirmationDialog";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import CustomFieldBadge from "../../jobs/[id]/components/Candidate/CustomFieldBadge";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: Job;
  index: number;
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  setIsEditMode: (editMode: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
  setDuplicate: (x: boolean) => void;
}

const JobCard = ({
  job,
  index,
  setSelectedJob,
  setIsDetailsOpen,
  setIsEditMode,
  handleDeleteClick,
  setDuplicate,
}: JobCardProps) => {
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const { formNameObject } = useCustomForm("Job Position");
  const router = useRouter();

  return (
    <>
      <Draggable key={job._id} draggableId={job._id} index={index}>
        {(provided: any) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border border-gray-200 dark:border-gray-700 p-4 shadow-sm cursor-pointer hover:shadow-lg transition-all duration-200 relative mx-1 mt-2 hover:border-blue-200 dark:hover:border-blue-700 hover:scale-[1.02]"
          >
            {/* Header Section - Job Title and Actions */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">
                {job.title}
              </h3>
              <div className="flex items-center gap-1">
                {/* Warning Icon for Unpublished Jobs */}
                {!job.isPublished && (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center h-8 w-8 text-amber-500 hover:text-amber-600 cursor-pointer">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white border border-gray-200 text-black">
                        <p>
                          Candidates cannot apply until this job is published.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Layout Icon for Opening Job Board */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/jobs/${job._id}`);
                  }}
                >
                  <Layout className="h-4 w-4" />
                </Button>

                {/* Three Dots Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/jobs/${job._id}`);
                      }}
                    >
                      <Layout className="h-4 w-4 mr-2" />
                      Open Board
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setIsEditMode(true);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Job
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDuplicateDialogOpen(true);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Job
                    </DropdownMenuItem>
                    {!job.isDeleted ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(job._id);
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Archive Job
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(job._id);
                          setSelectedJob(job);
                        }}
                        className="text-blue-600 focus:text-blue-600"
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Unarchive Job
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Subtle Separator after Header */}
            <div className="border-b border-gray-100 dark:border-gray-800 mb-4"></div>

            {/* Job Details */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {job.candidateCount} Candidates
                </p>
              </div>

              {/* Experience */}
              {(job.experience || job.experience === 0) && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Experience:
                  </span>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    {job.experience} years
                  </span>
                </div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Skills:
                  </span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                    {job.skills.slice(0, 3).join(", ")}
                    {job.skills.length > 3
                      ? ` +${job.skills.length - 3} more`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Custom Fields */}
            {job.customFields &&
              Object.entries(job.customFields).filter(([key, value]) => {
                const field = formNameObject?.fields.find(
                  (f) => f.label === key
                );
                if (field?.jobId && field.jobId !== job._id) {
                  return false;
                }
                return field?.showOnCard;
              }).length > 0 && (
                <div className="mb-4 space-y-3">
                  {Object.entries(job.customFields)
                    .filter(([key, value]) => {
                      const field = formNameObject?.fields.find(
                        (f) => f.label === key
                      );
                      if (field?.jobId && field.jobId !== job._id) {
                        return false;
                      }
                      return field?.showOnCard;
                    })
                    .map(([key, value], i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {key}:
                        </span>
                        <span className="font-semibold text-orange-700 dark:text-orange-400">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

            {/* Footer - Created Date */}
            <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              Created{" "}
              {job.tracking?.createdAt
                ? formatDistanceToNow(new Date(job.tracking.createdAt), {
                    addSuffix: true,
                  })
                : "recently"}
            </div>
          </div>
        )}
      </Draggable>

      {isDuplicateDialogOpen && (
        <ConfirmationDialog
          title="Create Duplicate Job"
          message="Are you sure you want to create a duplicate of this job?"
          isOpen={isDuplicateDialogOpen}
          setIsOpen={setIsDuplicateDialogOpen}
          onConfirm={() => {
            setSelectedJob(job);
            setDuplicate(true);
          }}
          onCancel={() => setIsDuplicateDialogOpen(false)}
          className="sm:max-w-[300px]"
        />
      )}
    </>
  );
};

export default JobCard;
