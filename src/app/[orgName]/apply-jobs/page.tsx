"use client";

import { useEffect, useState } from "react";
import JobModal from "./JobModal";
import { useFetchOpenJobQuery } from "@/lib/features/job/jobApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import { useFetchAppliedApplicationQuery } from "@/lib/features/candidate/candidateApi";
import Image from "next/image";

// Define the Job type here or import it if it's defined elsewhere
interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experience: number;
}

interface User {
  role: string;
  appliedApplications: string[];
  // Add other properties as needed
}

export default function ApplyJobs({
  params,
}: {
  params: Promise<{ orgName: string }>;
}) {
  const [orgName, setOrgName] = useState<string>("");
  const {
    data: jobs,
    isLoading,
    error,
  } = useFetchOpenJobQuery({ orgName: orgName }, { skip: orgName === "" });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // Allow Job or null
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appliedApplications, setAppliedApplications] = useState<string[]>([]);
  const { data } = useFetchAppliedApplicationQuery({});
  const { toast } = useToast();
  const router = useRouter();
  const { setUserLoggedIn, userLoggedIn } = useCustomFields();

  useEffect(() => {
    (async () => {
      const resolvedParams = await params; // Resolve the promise
      setOrgName(resolvedParams.orgName); // Set the orgName state
    })();
  }, [params]);

  useEffect(() => {
    const user = Cookies.get("user");
    if (user && data) {
      setUserLoggedIn(true);
      const parsedUser = JSON.parse(user) as User;
      if (parsedUser && parsedUser.role === "candidate") {
        setAppliedApplications(data.appliedApplications);
      }
    }
  }, [data]);

  if (isLoading)
    return <div className="flex justify-center p-8">Loading...</div>;
  if (error)
    return <div className="flex justify-center p-8">Error loading jobs</div>;

  const handleLogout = () => {
    // Clear user data and token
    Cookies.remove("user");
    Cookies.remove("token");

    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });

    router.push("/auth/login");
  };

  return (
    <div className="container mx-auto p-2">
      <div className="px-3 py-6 flex flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-4 ">
            Open Positions for {orgName}
          </h1>
        </div>


        {userLoggedIn && <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all text-red-500 hover:text-red-600 hover:bg-red-50",
            "justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs && jobs.length > 0 ? jobs.map((job, index) => (
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
        ))
          : <div className="px-3 font-bold text-gray-500 w-[100vw] flex flex-col items-center justify-center">
            <Image
              src="/notfound.jpg"
              alt="No data illustration"
              width={600}
              height={600}
            />
            No Jobs Found
          </div>}
      </div>

      <JobModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgName={orgName}
        readOnly={
          !!(
            appliedApplications &&
            selectedJob &&
            appliedApplications.includes(selectedJob?._id)
          )
        }
      />
    </div>
  );
}
