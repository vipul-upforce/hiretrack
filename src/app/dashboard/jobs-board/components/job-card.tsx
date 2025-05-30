"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Info, Trash2, ArchiveRestore } from "lucide-react";
import Link from "next/link";

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
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-card flex justify-between border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <Link
            href={`/dashboard/jobs/${job._id}`}
            className="text-wrap break-words w-[90%]"
          >
            <h3 className="font-medium">{job.title}</h3>
            <p className="text-sm text-muted-foreground">
              {job.candidateCount} Candidates
            </p>
          </Link>
          <div className="flex items-center justify-end gap-1">
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
      )}
    </Draggable>
  );
};

export default JobCard;
