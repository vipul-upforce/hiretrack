'use client';

import { Droppable, DroppableProvided } from '@hello-pangea/dnd';
import { Job } from '@/types/job';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import JobCard from './job-card';

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
  onEmailSettingsClick?: (job: Job) => void;
}

function KanbanColumn({
  column,
  isCreatingJob,
  setSelectedJob,
  setIsDetailsOpen,
  setIsEditMode,
  handleDeleteClick,
  setDuplicate,
  onEmailSettingsClick,
}: KanbanColumnProps) {
  return (
    <div className="min-w-[30px] flex-1 px-2">
      <div className="flex h-full w-full min-w-0 max-w-full flex-col rounded-lg bg-white/70 p-3 dark:bg-black/30">
        <div className="mb-4 flex-shrink-0 px-2 py-3">
          <div className="flex items-center justify-between">
            <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              {column.title}
            </h3>
            <span className="min-w-[24px] rounded-full bg-white px-2 py-1 text-center text-xs font-medium text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-400">
              {column.jobs.length}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 overflow-hidden pr-2">
          <Droppable droppableId={column.id}>
            {(provided: DroppableProvided) => (
              <CustomScrollbar className="h-full">
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="h-auto min-w-0 space-y-3 pb-4"
                >
                  {isCreatingJob && column.id === 'draft' && (
                    <div className="animate-pulse rounded-xl bg-gray-100 p-4 shadow-sm dark:bg-black">
                      <div className="mb-2 h-5 w-2/3 rounded bg-gray-300 dark:bg-gray-700" />
                      <div className="h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-700" />
                    </div>
                  )}

                  {column.jobs.map((job, index) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      index={index}
                      setSelectedJob={setSelectedJob}
                      setIsDetailsOpen={setIsDetailsOpen}
                      setIsEditMode={setIsEditMode}
                      handleDeleteClick={handleDeleteClick}
                      setDuplicate={setDuplicate}
                      onEmailSettingsClick={onEmailSettingsClick}
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
}

export default KanbanColumn;
