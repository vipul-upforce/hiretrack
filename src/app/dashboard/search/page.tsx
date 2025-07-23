import { Suspense } from "react";
import CandidateSearch from "@/components/forms/candidate-search";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <div className="px-4 mt-2">
      <h1 className="text-3xl font-bold mb-4">Candidate Search</h1>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <CandidateSearch />
      </Suspense>
    </div>
  );
}
