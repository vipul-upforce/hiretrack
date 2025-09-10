import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateJobDialog } from "./create-job-dialog";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const LoaderSkeleton = () => (
  <div className="w-full max-w-full space-y-10">
    <div className="border-b">
      {/* <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <Skeleton className="w-40 h-[16px] rounded-lg" />
        </CardTitle>
        <CreateJobDialog userRole="hr" onJobCreated={() => { }} />
      </CardHeader> */}
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="font-semibold text-lg">
          <Skeleton className="w-40 h-[16px] rounded-lg" />
        </div>
        <div className="flex items-center space-x-4">

          <div className="flex space-x-2">
            {/* <CreateJobDialog userRole="hr" onJobCreated={() => { }} /> */}
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </div>
        </div>
      </CardHeader>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
      {["Draft", "Open", "Closed"].map((title, index) => (
        <div key={index} className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex flex-row justify-between items-center">
                {title}
                <Skeleton className="ml-2 w-5 h-5 inline-block rounded-full" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {index === 0 ? (
                  <>
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                  </>
                ) : index === 1 ? (
                  <>
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                  </>
                ) : index === 2 ? (
                  <>
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  </div>
);

export default LoaderSkeleton;
