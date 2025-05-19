"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Job } from "@/types/job";
// import { Button } from "@/components/ui/button";
// import { Info, Trash2, ArchiveRestore } from "lucide-react";
// import { useRouter } from "next/navigation";
import JobCard from "./job-card";

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    jobs: Job[];
  };
  isCreatingJob: boolean;
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
}

const KanbanColumn = ({
  column,
  isCreatingJob,
  setSelectedJob,
  setIsDetailsOpen,
  handleDeleteClick,
}: KanbanColumnProps) => {
  //   const router = useRouter();

  return (
    <div className="space-y-4 min-h-[50vh] h-full">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {column.title}
            <span className="ml-2 text-sm text-muted-foreground">
              ({column.jobs.length})
            </span>
            <span
              className="ml-2 cursor-pointer"
              onClick={() => alert("Job info")}
            >
              <i className="fas fa-info-circle" aria-hidden="true"></i>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full">
          <Droppable droppableId={column.id}>
            {(provided: any) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 min-h-full"
              >
                {isCreatingJob && column.id === "draft" && (
                  <div className="animate-pulse bg-muted/50 border rounded-lg p-3 shadow-sm">
                    <div className="h-5 w-2/3 bg-muted rounded mb-2"></div>
                    <div className="h-4 w-1/3 bg-muted rounded"></div>
                  </div>
                )}

                {column.jobs.map((job, index) => (
                  //   <Draggable key={job._id} draggableId={job._id} index={index}>
                  //     {(provided: any) => (
                  //       <div
                  //         ref={provided.innerRef}
                  //         {...provided.draggableProps}
                  //         {...provided.dragHandleProps}
                  //         className="bg-card flex justify-between border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  //         onClick={() => {
                  //           router.push(`/dashboard/jobs/${job._id}`);
                  //         }}
                  //       >
                  //         <div className="text-wrap break-words w-[90%]">
                  //           <h3 className="font-medium">{job.title}</h3>
                  //           <p className="text-sm text-muted-foreground">
                  //             {job.candidateCount} Candidates
                  //           </p>
                  //         </div>
                  //         <div className="flex items-center justify-end gap-1">
                  //           <Button
                  //             variant="ghost"
                  //             size="icon"
                  //             className="h-8 w-8"
                  //             onClick={(e) => {
                  //               e.stopPropagation();
                  //               setSelectedJob(job);
                  //               setIsDetailsOpen(true);
                  //             }}
                  //           >
                  //             <Info className="h-4 w-4" />
                  //           </Button>
                  //           {!job.isDeleted ? (
                  //             <Button
                  //               variant="ghost"
                  //               size="icon"
                  //               className="text-destructive hover:text-destructive/90"
                  //               onClick={(e) => {
                  //                 e.stopPropagation();
                  //                 handleDeleteClick(job._id);
                  //               }}
                  //             >
                  //               <Trash2 className="h-4 w-4" />
                  //             </Button>
                  //           ) : (
                  //             <Button
                  //               variant="ghost"
                  //               size="icon"
                  //               className="text-blue-500 hover:text-blue-500/90"
                  //               onClick={(e) => {
                  //                 e.stopPropagation();
                  //                 handleDeleteClick(job._id);
                  //                 setSelectedJob(job);
                  //               }}
                  //             >
                  //               <ArchiveRestore className="h-4 w-4" />
                  //             </Button>
                  //           )}
                  //         </div>
                  //       </div>
                  //     )}
                  //   </Draggable>
                  <JobCard
                    key={job._id}
                    job={job}
                    index={index}
                    setSelectedJob={setSelectedJob}
                    setIsDetailsOpen={setIsDetailsOpen}
                    handleDeleteClick={handleDeleteClick}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanColumn;
