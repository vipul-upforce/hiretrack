"use client";

import { useState } from "react";
// import JobModal from './JobModal';
import JobModal from "./JobModal";
import { useFetchOpenJobQuery } from "@/lib/features/job/jobApi";

// Define the Job type here or import it if it's defined elsewhere
interface Job {
  title: string;
  description: string;
  skills: string[];
  experience: number;
}

export default function ApplyJobs() {
  const { data: jobs, isLoading, error } = useFetchOpenJobQuery();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // Allow Job or null
  const [isModalOpen, setIsModalOpen] = useState(false);
  if (isLoading)
    return <div className="flex justify-center p-8">Loading...</div>;
  if (error)
    return <div className="flex justify-center p-8">Error loading jobs</div>;

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4">Open Positions</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs?.map((job, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border-2 inset-shadow-sm p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedJob(job); // This will now work correctly
              setIsModalOpen(true);
            }}
          >
            <h2 className="text-xl font-semibold mb-2">{job.title}</h2>
            <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 3).map((skill, i) => (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Experience: {job.experience} years
            </div>
          </div>
        ))}
      </div>

      <JobModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
