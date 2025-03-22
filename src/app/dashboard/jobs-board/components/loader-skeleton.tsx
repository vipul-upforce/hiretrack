import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateJobDialog } from "./create-job-dialog";

const LoaderSkeleton = ()=>(
    <div className="w-full max-w-full space-y-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Job Positions</CardTitle>
            <CreateJobDialog
              userRole='hr'
              onJobCreated={()=>{}}
            />
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["Draft", "Open", "Closed"].map((title, index) => (
            <div key={index} className="space-y-4">
              <Card className="h-26">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex flex-row items-center">
                    {title}
                    <Skeleton className="ml-2 w-5 h-5 inline-block rounded-full" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {index ===0 ?(
                      <>
                      <Skeleton className="w-full h-[70px] rounded-lg"/>
                      <Skeleton className="w-full h-[70px] rounded-lg"/>
                      <Skeleton className="w-full h-[70px] rounded-lg"/>
                    </>
                    ):
                    index === 1 ? (
                      <>
                        <Skeleton className="w-full h-[70px] rounded-lg"/>
                        <Skeleton className="w-full h-[70px] rounded-lg"/>
                        <Skeleton className="w-full h-[70px] rounded-lg"/>
                      </>
                    ) : index === 2 ? (
                      <>
                        <Skeleton className="w-full h-[70px] rounded-lg"/>
                        <Skeleton className="w-full h-[70px] rounded-lg"/>
                        <Skeleton className="w-full h-[70px] rounded-lg"/>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
    </div>
)

export default LoaderSkeleton