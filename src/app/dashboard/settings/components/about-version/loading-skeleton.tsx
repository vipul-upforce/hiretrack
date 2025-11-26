"use client";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const AboutVersionLoadingSkeleton = () => {
  return (
    <div className="px-6 py-4 space-y-6">
      <Skeleton className="h-8 w-full" />
      <div className="flex justify-between gap-2  pt-1">
        <Skeleton className="h-8 w-60 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
};

export default AboutVersionLoadingSkeleton;
