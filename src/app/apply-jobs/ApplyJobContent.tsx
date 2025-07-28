import { useEffect, useState } from "react";
import JobModal from "./JobModal";
import { useFetchOpenJobQuery } from "@/lib/features/job/jobApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Search, MapPin, Calendar, Briefcase, ChevronRight } from "lucide-react";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import { useFetchAppliedApplicationQuery } from "@/lib/features/candidate/candidateApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { SerializedError } from "@reduxjs/toolkit";
import Image from "next/image";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import InvalidPage from "@/components/InvalidPage";
import { Input } from "@/components/ui/input";
import { JobCardSkeleton } from "./JobCardSkeleton";
import { ISettings } from "@/lib/models/settings";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import CustomFieldBadge from "../dashboard/jobs/[id]/components/Candidate/CustomFieldBadge";

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experience: number;
  salary?: {
    min: 0;
    max: 0;
    inText: string;
    isPrivate: false;
  };
  customFields?: Record<string, any>;
}

function isFetchBaseQueryError(
  error: FetchBaseQueryError | SerializedError | unknown
): error is FetchBaseQueryError {
  return typeof error === "object" && error !== null && "status" in error;
}

export default function ApplyJobsContent({
  showHeaderFooter = true,
}: {
  showHeaderFooter?: boolean;
}) {
  const [orgName, setOrgName] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsJobModalOpen] = useState(false);
  const [appliedApplications, setAppliedApplications] = useState<string[]>([]);
  const { data } = useFetchAppliedApplicationQuery(
    {},
    { skip: orgName === "" }
  );

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUserLoggedIn, userLoggedIn } = useCustomFields();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [queryTitle, setQueryTitle] = useState<string>("");
  const [invalidPage, setInvalidPage] = useState<boolean>(false);
  const [layoutState, setLayoutState] = useState<{
    headerHTML: string;
    footerHTML: string;
  }>({
    headerHTML: "",
    footerHTML: "",
  });

  // Portal settings for styling
  const [primaryColor, setPrimaryColor] = useState<string>("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState<string>("#8b5cf6");

  const {
    data: jobs,
    isLoading,
    error,
  } = useFetchOpenJobQuery(
    { orgName: orgName, title: queryTitle },
    { skip: orgName === null }
  ) as {
    data: Job[];
    isLoading: boolean;
    error: FetchBaseQueryError | SerializedError;
  };
  const { formNameObject } = useCustomForm("Job Position");

  async function checkAllowance() {
    const urlOrgName = searchParams?.get("o") || orgName;

    const data = await fetch("/api/organization");
    if (!data.ok) {
      return;
    }
    const allowance = await data?.json();

    if (urlOrgName) {
      setInvalidPage(false);
      const config = allowance?.data?.find(
        (org: ISettings) => org?.portalConfigs?.portalName === urlOrgName
      ).portalConfigs;
      
      // Set portal colors
      if (config?.primaryColor) {
        setPrimaryColor(config.primaryColor);
      }
      if (config?.secondaryColor) {
        setSecondaryColor(config.secondaryColor);
      }
      
      if (config?.portalHeader?.url && config?.portalFooter?.url) {
        const [headerRes, footerRes] = await Promise.all([
          fetch(config.portalHeader.url),
          fetch(config.portalFooter.url),
        ]);
        const [headerHTML, footerHTML] = await Promise.all([
          headerRes.text(),
          footerRes.text(),
        ]);

        setLayoutState({
          headerHTML,
          footerHTML,
        });
      }
      return;
    }

    if (allowance.allow) {
      setInvalidPage(true);
    }
    const config = allowance?.data?.[0]?.portalConfigs;

    // Set portal colors for default org
    if (config?.primaryColor) {
      setPrimaryColor(config.primaryColor);
    }
    if (config?.secondaryColor) {
      setSecondaryColor(config.secondaryColor);
    }

    if (config?.portalHeader?.url && config?.portalFooter?.url) {
      const [headerRes, footerRes] = await Promise.all([
        fetch(config.portalHeader.url),
        fetch(config.portalFooter.url),
      ]);
      const [headerHTML, footerHTML] = await Promise.all([
        headerRes.text(),
        footerRes.text(),
      ]);

      setLayoutState({
        headerHTML,
        footerHTML,
      });
    }
  }

  useEffect(() => {
    checkAllowance();
  }, [searchParams, orgName]);

  const pageInit = async () => {
    // debugger;
    const token = Cookies.get("token");
    const urlOrgName = searchParams?.get("o");
    if (token) {
      try {
        const decryptedResponse = await verifyAndDecryptJWTToken(token);
        if (
          decryptedResponse.success &&
          decryptedResponse.user &&
          decryptedResponse.user.organizationInfo &&
          decryptedResponse.user.organizationInfo.name
        ) {
          setOrgName(decryptedResponse.user.organizationInfo.name);
          setUserLoggedIn(true);
        } else {
          setOrgName(urlOrgName || "");
        }
      } catch {
        setOrgName(urlOrgName || "");
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        });
        router.push("/auth/login");
      }
    } else {
      setOrgName(urlOrgName || "");
    }
  };

  useEffect(() => {
    pageInit();
  }, [searchParams]);

  useEffect(() => {
    if (data) {
      setAppliedApplications(data.appliedApplications);
    }
  }, [data]);

  const handleSearch = () => {
    setQueryTitle(searchTerm);
  };

  if (invalidPage) {
    return <InvalidPage message="Page Doesn't Exist" />;
  }

  if (isLoading)
    return <div className="flex justify-center p-8">Loading...</div>;

  if (error && !isLoading) {
    if (isFetchBaseQueryError(error) && error.status !== 404) {
      return (
        <div className="px-3 font-bold text-muted-foreground w-[100vw] flex flex-col items-center justify-center">
          <Image
            src="/error.webp"
            alt="No data illustration"
            width={600}
            height={600}
          />
          {isFetchBaseQueryError(error) &&
            "data" in error &&
            (error.data as { error: string })?.error}
        </div>
      );
    } else {
      return (
        <div className="px-3 font-bold text-muted-foreground w-[100vw] flex flex-col items-center justify-center">
          <Image
            src="/notfound.jpg"
            alt="No data illustration"
            width={600}
            height={600}
          />
          {isFetchBaseQueryError(error) &&
            "data" in error &&
            (error.data as { error: string })?.error}
        </div>
      );
    }
  }

  const handleLogout = () => {
    // Clear user data and token
    Cookies.remove("token");

    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });

    router.push("/auth/login");
  };
  console.log(jobs);
  return (
    <div className={showHeaderFooter ? "flex flex-col min-h-screen relative" : "relative"}>
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, ${primaryColor}22 0%, transparent 60%), 
                             radial-gradient(circle at 80% 20%, ${secondaryColor}22 0%, transparent 60%),
                             radial-gradient(circle at 40% 40%, ${primaryColor}11 0%, transparent 50%)`,
          }}
        />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, ${primaryColor}05 50%, transparent 100%)`,
          }}
        />
      </div>

      {showHeaderFooter && (
        <div dangerouslySetInnerHTML={{ __html: layoutState?.headerHTML }} />
      )}
      <main className={showHeaderFooter ? "flex-1 p-4 relative z-10" : "relative z-10"}>
        <div className="container mx-auto p-2">
          <div className="py-4 flex flex-row justify-between items-start mb-8">
            <div>
              <h1 className="lg:text-3xl sm:text-2xl text-xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Open Positions {orgName ? `for ${orgName}` : ""}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Discover amazing opportunities and take your career to the next level
              </p>
            </div>

            {userLoggedIn && (
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/50 backdrop-blur-sm",
                  "justify-start"
                )}
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
          
          {jobs && jobs.length > 5 && (
            <div className="flex gap-3 mb-8 w-full flex-row">
              <div className="relative w-full flex flex-row items-center max-w-md">
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-12 pr-4 py-3 border rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Search className="absolute left-4 text-gray-400 h-5 w-5" />
              </div>
              <Button 
                onClick={handleSearch} 
                className="px-6 py-3 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              // Show skeleton loading cards
              <>
                {[...Array(6)].map((_, index) => (
                  <JobCardSkeleton key={index} />
                ))}
              </>
            ) : error ? (
              // Show error state
              <div className="px-3 font-bold text-muted-foreground w-[100vw] flex flex-col items-center justify-center">
                <Image
                  src={
                    isFetchBaseQueryError(error) && error.status !== 404
                      ? "/error.webp"
                      : "/notfound.jpg"
                  }
                  alt="No data illustration"
                  width={600}
                  height={600}
                />
                {isFetchBaseQueryError(error) &&
                  "data" in error &&
                  (error.data as { error: string })?.error}
              </div>
            ) : jobs && jobs.length > 0 ? (
              // Show job cards
              jobs.map((job, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
                  onClick={() => {
                    setSelectedJob(job);
                    setIsJobModalOpen(true);
                  }}
                >

                  {/* Card content */}
                  <div className="flex flex-col h-full">
                    {/* Header section */}
                    <div className="flex-1 mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                          {job.title}
                        </h2>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div 
                        className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4"
                        dangerouslySetInnerHTML={{
                          __html: job?.description || "No description found",
                        }}
                      />

                      {/* Skills badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.skills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 3 && (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            +{job.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer section */}
                    <div className="space-y-3">
                      {/* Experience and Salary row */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Briefcase className="w-4 h-4" />
                          <span className="font-medium">{job.experience} years exp</span>
                        </div>

                        {job.salary && (
                          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <span className="w-4 h-4 flex items-center justify-center text-sm font-semibold">₹</span>
                            {job.salary?.inText || job.salary?.inText === "" ? (
                              <span className="text-sm font-semibold">
                                {job.salary.inText}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold">
                                {job.salary?.min && job.salary.min !== 0 && `${job.salary.min}`}
                                {job.salary?.min && job.salary.min !== 0 && job.salary?.max && job.salary.max !== 0 && "-"}
                                {job.salary?.max && job.salary.max !== 0 && `${job.salary.max}`}
                                {(job.salary?.min || job.salary?.max) && " LPA"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Custom fields */}
                      {job?.customFields && Object.entries(job?.customFields)
                        .filter(([key, value]) => {
                          const field = formNameObject?.fields.find(
                            (f) => f.label === key
                          );
                          if (field?.jobId && field.jobId !== job?._id)
                            return false;
                          if (
                            (typeof value === "string" && value === "") ||
                            (typeof value === "object" &&
                              Object.keys(value).length === 0)
                          ) {
                            return false;
                          }
                          return field?.showOnCard;
                        }).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {Object.entries(job?.customFields)
                            .filter(([key, value]) => {
                              const field = formNameObject?.fields.find(
                                (f) => f.label === key
                              );
                              if (field?.jobId && field.jobId !== job?._id)
                                return false;
                              if (
                                (typeof value === "string" && value === "") ||
                                (typeof value === "object" &&
                                  Object.keys(value).length === 0)
                              ) {
                                return false;
                              }
                              return field?.showOnCard;
                            })
                            .map(([key, value], i) => (
                              <div key={i}>
                                <CustomFieldBadge kii={key} value={value} />
                              </div>
                            ))}
                        </div>
                      )}


                      {/* Apply indicator */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Click to view details & apply
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              ""
            )}
          </div>
          {error && !jobs && (
            <div className="px-3 font-bold text-muted-foreground w-[100vw] flex flex-col items-center justify-center">
              <Image
                src="/notfound.jpg"
                alt="No data illustration"
                width={600}
                height={600}
              />
              No Jobs Found
            </div>
          )}
          <JobModal
            job={selectedJob}
            isOpen={isModalOpen}
            onClose={() => setIsJobModalOpen(false)}
            orgName={orgName}
            readOnly={
              !!(
                appliedApplications &&
                selectedJob &&
                appliedApplications.includes(selectedJob?._id)
              )
            }
          />
          {/* )} */}
        </div>
      </main>
      {showHeaderFooter && (
        <div dangerouslySetInnerHTML={{ __html: layoutState.footerHTML }} />
      )}
    </div>
  );
}
