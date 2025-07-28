"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Job } from "@/types/job";
// import { Button } from "@/components/ui/button";
// import { Info, Trash2, ArchiveRestore } from "lucide-react";
// import { useRouter } from "next/navigation";
import JobCard from "./job-card";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    jobs: Job[];
  };
  isCreatingJob: boolean;
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  setIsEditMode: (editMode: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
  setDuplicate: (x: boolean) => void;
}

const KanbanColumn = ({
  column,
  isCreatingJob,
  setSelectedJob,
  setIsDetailsOpen,
  setIsEditMode,
  handleDeleteClick,
  setDuplicate,
}: KanbanColumnProps) => {
  //   const router = useRouter();

  return (
    <div className="flex-1 min-w-[450px] px-2">
      <div className="h-full flex flex-col bg-gray-50/70 dark:bg-gray-800/30 rounded-lg p-3 min-w-0 w-full max-w-full">
        <div className="py-3 flex-shrink-0 px-2 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 truncate">
              {column.title}
            </h3>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full min-w-[24px] text-center shadow-sm">
              {column.jobs.length}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden space-y-3 pr-2 min-w-0">
          <Droppable droppableId={column.id}>
            {(provided: any) => (
              <CustomScrollbar className="h-full">
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3 pb-4 min-w-0"
                >
                  {isCreatingJob && column.id === "draft" && (
                    <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                      <div className="h-5 w-2/3 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-700 rounded"></div>
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
                      setIsEditMode={setIsEditMode}
                      handleDeleteClick={handleDeleteClick}
                      setDuplicate={setDuplicate}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              </CustomScrollbar>
            )}
          </Droppable>
        </div>
      </div>
    </div>
  );
};

export default KanbanColumn;
