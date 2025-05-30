"use client";
import { Suspense } from "react";
import ApplyJobsContent from "./ApplyJobContent";


export default function ApplyJobs() {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">Loading...</div>}
    >
      <ApplyJobsContent showHeaderFooter={true} />
    </Suspense>
  );
}
