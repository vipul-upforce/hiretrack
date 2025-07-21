import { useEffect, useState } from "react";
import JobModal from "./JobModal";
import { useFetchOpenJobQuery } from "@/lib/features/job/jobApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Search } from "lucide-react";
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
        <div className="px-3 font-bold text-gray-500 w-[100vw] flex flex-col items-center justify-center">
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
        <div className="px-3 font-bold text-gray-500 w-[100vw] flex flex-col items-center justify-center">
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
    <div className={showHeaderFooter ? "flex flex-col min-h-screen" : ""}>
      {showHeaderFooter && (
        <div dangerouslySetInnerHTML={{ __html: layoutState?.headerHTML }} />
      )}
      <main className={showHeaderFooter ? "flex-1 p-4" : ""}>
        <div className="container mx-auto p-2">
          <div className="py-2 flex flex-row justify-between items-start">
            <div>
              <h1 className="lg:text-2xl sm:text-xl text-lg font-bold mb-4 ">
                Open Positions {orgName ? `for ${orgName}` : ""}
              </h1>
            </div>

            {userLoggedIn && (
              <Button
                variant="ghost"
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-all text-red-500 hover:text-red-600 hover:bg-red-50",
                  "justify-start"
                )}
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
          <div className="flex gap-2 mb-4 w-full  flex-row ">
            <div className="relative w-full flex flex-row items-center max-w-md">
              <Input
                type="text"
                placeholder="Search jobs..."
                className="pl-10 pr-4  border rounded-lg w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
              <Search className="absolute left-3 text-gray-400 h-5 w-5" />
            </div>
            <Button onClick={handleSearch} className="px-4 py-2 text-sm">
              Search
            </Button>
          </div>
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
              <div className="px-3 font-bold text-gray-500 w-[100vw] flex flex-col items-center justify-center">
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
                  className="bg-white break-words rounded-lg border inset-shadow-sm p-4 lg:p-6 cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between"
                  onClick={() => {
                    setSelectedJob(job);
                    setIsJobModalOpen(true);
                  }}
                >
                  <div className="h-full">
                    <h2 className="text-lg lg:text-xl font-semibold mb-2 line-clamp-3">
                      {job.title}
                    </h2>
                    <p
                      className="text-gray-600 mb-4 line-clamp-2 text-sm lg:text-lg"
                      dangerouslySetInnerHTML={{
                        __html: job?.description || "No description found",
                      }}
                    ></p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.slice(0, 3).map((skill, i) => (
                        <span
                          key={i}
                          className="break-all bg-blue-100 text-blue-800 text-sm  px-3 py-1 rounded-full h-7 max-w-[30%] overflow-clip"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 text-sm text-gray-500 flex flex-rw items-center justify-between">
                      <p>Experience: {job.experience} years</p>

                      {job.salary ? (
                        <div className="flex items-center">
                          {job.salary?.inText || job.salary?.inText === "" ? (
                            <span className="text-sm font-medium">
                              {job.salary.inText}
                            </span>
                          ) : (
                            <>
                              {job.salary?.min && job.salary.min !== 0 && (
                                <span className="text-sm font-medium">
                                  {job.salary.min} LPA
                                </span>
                              )}
                              {job.salary?.min &&
                                job.salary.min !== 0 &&
                                job.salary?.max &&
                                job.salary.max !== 0 && (
                                  <span className="mx-1 text-muted-foreground">
                                    -
                                  </span>
                                )}
                              {job.salary?.max && job.salary.max !== 0 && (
                                <span className="text-sm font-medium">
                                  {job.salary.max} LPA
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        ""
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 ">
                      {job?.customFields &&
                        Object.entries(job?.customFields)
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
                  </div>
                </div>
              ))
            ) : (
              ""
            )}
          </div>
          {error && !jobs && (
            <div className="px-3 font-bold text-gray-500 w-[100vw] flex flex-col items-center justify-center">
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
