import { GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LoaderSkeleton = () => (
  //COMMENTED ELEMENTS ARE DIRECTLY INSERTED IN THE JOB/[ID] PAGE, WHEN ITS LOADING THE REFs BY DRAGTOSCROLL HOOK
  <div className="h-full flex gap-3 overflow-x-auto">
    {/* Columns Section */}
    {["1", "2", "3", "4", "5"].map((_, index) => (
      <div key={index} className="w-96 flex-shrink-0">
        <div className="rounded-xl border bg-card text-card-foreground shadow h-full flex flex-col">
          {/* Column Header */}
          <div className="pb-2 flex-shrink-0 px-4 pt-4 flex items-center space-x-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="text-lg font-semibold flex flex-row items-center">
              <Skeleton className="w-40 h-[16px] rounded-lg" />
              <span className="ml-2 text-sm text-muted-foreground">
                {/* ({column.candidates.length}) */}
              </span>
            </div>
          </div>

          {/* Column Content */}
          <div className="flex-1 overflow-hidden p-0">
            <div className="px-4 pb-4 space-y-3">
              {/* <Droppable droppableId={column.id} type="candidate">

              </Droppable> */}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoaderSkeleton;
