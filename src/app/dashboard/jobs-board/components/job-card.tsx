"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Info, Trash2, ArchiveRestore, MinusCircleIcon } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobCardProps {
  job: Job;
  index: number;
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
}

const JobCard = ({
  job,
  index,
  setSelectedJob,
  setIsDetailsOpen,
  handleDeleteClick,
}: JobCardProps) => {
  return (
    <Draggable key={job._id} draggableId={job._id} index={index}>
      {(provided: any) => (
        <>
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="bg-card flex justify-between border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative"
          >
            {!job.isPublished && (
              <div className="absolute top-2 right-2 cursor-pointer">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MinusCircleIcon className="h-3 w-3 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border border-gray-200 text-black">
                      <p>
                        Candidates cannot apply until this job is published.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            <Link
              href={`/dashboard/jobs/${job._id}`}
              className="text-wrap break-words w-[90%]"
            >
              {/* <h3 className="font-medium">{job.title}</h3> */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium flex flex-row items-center">
                  {job.title}
                </h3>
              </div>

              <p className="text-sm text-muted-foreground">
                {job.candidateCount} Candidates
              </p>
            </Link>
            <div className="flex items-center justify-end gap-1">
              {/* {!job.isPublished && (
                // <TooltipProvider>
                //   <Tooltip>
                //     <TooltipTrigger asChild>
                //       <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 cursor-default">
                //         Not Published
                //       </div>
                //     </TooltipTrigger>
                //     <TooltipContent className="bg-red-500">
                //       <p>This job is not visible to candidates.</p>
                //     </TooltipContent>
                //   </Tooltip>
                // </TooltipProvider>
                <div className="">
                  <MinusCircleIcon className="h-4 w-4 text-red-500" />
                </div>
              )} */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedJob(job);
                  setIsDetailsOpen(true);
                }}
              >
                <Info className="h-4 w-4" />
              </Button>
              {!job.isDeleted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(job._id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-500 hover:text-blue-500/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(job._id);
                    setSelectedJob(job);
                  }}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Draggable>
  );
};

export default JobCard;
