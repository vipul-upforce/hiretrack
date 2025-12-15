'use client';

import { Droppable } from '@hello-pangea/dnd';
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
    <div className="flex-1 min-w-[30px] px-2">
      <div className="h-full flex flex-col bg-white/70 dark:bg-black/30 rounded-lg p-3 min-w-0 w-full max-w-full">
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
                  className="h-auto space-y-3 pb-4 min-w-0"
                >
                  {isCreatingJob && column.id === 'draft' && (
                    <div className="animate-pulse bg-gray-100 dark:bg-black rounded-xl p-4 shadow-sm">
                      <div className="h-5 w-2/3 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                      <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-700 rounded" />
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
