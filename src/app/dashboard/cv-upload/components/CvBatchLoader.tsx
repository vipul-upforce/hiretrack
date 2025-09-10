"use client";

import { Skeleton } from "@/components/ui/skeleton";

const CvBatchLoader = () => {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Completed Batches</h2>
            <div className="space-y-4">
                {["1", "2", "3"].map((_, idx) => (
                    <div
                        key={idx}
                        className="border rounded-lg p-4 space-y-3 animate-pulse"
                    >
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-32 " />
                                <div className="flex gap-4 mt-2">
                                    <Skeleton className="h-3 w-14 " />
                                    <Skeleton className="h-3 w-20 " />
                                    <Skeleton className="h-3 w-16 " />
                                </div>
                            </div>
                            <div className="h-5 w-20 -full" />
                        </div>

                        {/* Items placeholder */}
                        <div className="mt-2 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="p-2 border rounded-lg flex items-center justify-between"
                                >
                                    <Skeleton className="h-3 w-40 " />
                                    <Skeleton className="h-5 w-16 -full" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
export default CvBatchLoader;