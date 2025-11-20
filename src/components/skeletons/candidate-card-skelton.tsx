import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Separator } from "../ui/separator";

export const CandidateCardSkeleton = () => {
  return (
    <Card className="w-[380px] border rounded-xl animate-pulse">
      <CardHeader className="space-y-2">
        <div className="flex flex-row justify-between">
          <Skeleton className="h-5 w-32 rounded" />
          <div className="flex flex-row gap-2">
            <Skeleton className="h-5 w-6 rounded" />
            <Skeleton className="h-5 w-6 rounded" />
            <Skeleton className="h-5 w-6 rounded" />
            <Skeleton className="h-5 w-6 rounded" />
          </div>
        </div>
        <div className="flex gap-2 flex-row justify-between">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Separator />
        {/* Info rows */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
            </div>
          ))}
          <Skeleton className="h-6 w-2/3 rounded" />
        </div>

        {/* Skills */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 " />
            ))}
          </div>
        </div>

        <Separator />
        {/* Evaluation scores */}
        <div className="flex flex-col gap-4">
          <Skeleton className="w-[40%] h-3" />
          <div className="flex flex-row justify-evenly gap-4 ">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-12 rounded-full  " />
            ))}
          </div>
        </div>

        <Separator />
      </CardContent>
    </Card>
  );
};
