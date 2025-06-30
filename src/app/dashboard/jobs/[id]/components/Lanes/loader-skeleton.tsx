import { GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LoaderSkeleton = () => (
  //COMMENTED ELEMENTS ARE DIRECTLY INSERTED IN THE JOB/[ID] PAGE, WHEN ITS LOADING THE REFs BY DRAGTOSCROLL HOOK
  <div className="space-y-6">
    {/* Header Section */}
    {/* <Skeleton className="w-56 h-[16px] rounded-lg" /> */}
    {/* <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-row items-center justify-between">
      <div className="font-semibold text-lg">
        <Skeleton className="w-40 h-[16px] rounded-lg" />
      </div>
      <div className="flex space-x-2">
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Lane
        </Button>
        <Button>
          <Plus className="h- w-4 mr-2" />
          Add Candidate
        </Button>
      </div>
    </div> */}

    {/* Columns Section */}
    <div className="grid grid-flow-col flex flex-row justify-start overflow-x-scroll pb-4">
      {["1", "2", "3", "4", "5"].map((_, index) => (
        <div key={index} className="space-y-4 mr-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow h-[75vh] w-[350px] p-6">
            {/* Column Header */}
            <div className="pb-3 flex items-center space-x-2">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <div className="text-lg font-semibold flex flex-row items-center">
                <Skeleton className="w-40 h-[16px] rounded-lg" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {/* ({column.candidates.length}) */}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="h-full">
              {/* <Droppable droppableId={column.id} type="candidate">
                  
              </Droppable> */}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default LoaderSkeleton;
