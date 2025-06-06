"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Cookies from "js-cookie";
import { Input } from "@/components/ui/input";
import type { OrgInfo } from "@/lib/models/user";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import DashboardLoader from "./components/dashboard-loader";
import ActionItems from "@/components/actionitems";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { RenderTodaysInterviews } from "./components/RenderTodaysInterviews";
import { RenderInterviewerAssignments } from "./components/RenderInterviewerAssignments";
import { MultiSelect } from "@/components/ui/multi-select";
interface User {
  name: string;
  email: string;
  role: string;
  organizationInfo: OrgInfo;
  id?: string;
}

export interface Assignment {
  id: string;
  _id?: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
  status: string;
  assignment: {
    assignedAt: string;
    time: string;
    name: string;
    interviewerId: {
      _id: string;
      name: string;
      email: string;
    };
    jobId: {
      title: string;
      skills: string[];
      description: string;
    };
  };
  jobId: {
    _id: string;
    title: string;
    skills: string[];
    description: string;
  };
  name: string;
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  tracking: {
    createdAt: string;
    updatedAt: string;
  };
  organizationId: string;
  location: string;
  experience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  remarks: {
    description: string;
    date: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  };
  attachments: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    _id: string;
  }[];
  customFields: { [key: string]: string };
  createdAt: string;
  updatedAt: string;
}

interface Interviewer {
  count: number;
  interviewerId: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  // const {
  //   data: userData,
  //   // isLoading: isUserLoading,
  //   // error,
  //   // refetch,
  // } = useGetUsersQuery();
  const itemsPerPage = 12;
  const [open, setOpen] = useState(false);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignedInterviewers, setAssignedInterviewers] = useState<
    Interviewer[]
  >([]);
  const [assignmentsCounts, setAssignmentsCounts] = useState<{
    [key: string]: number;
  }>({
    totalInterviews: 0,
    thisWeek: 0,
    today: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterText, setFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const shouldShowAssignments = user?.role === "admin" || user?.role === "hr";
  const isInterviewer = user?.role === "interviewer";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchAssignments = useCallback(
    async (page = 1, isAppend = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;

      if (!isAppend) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          isPagination: "true",
          page: page.toString(),
          limit: itemsPerPage.toString(),
          filterValue: filterText.toString(),
          assignedTo: selectedAssignedTo,
        });

        const response = await fetch(
          `/api/candidates/assignments?${params.toString()}`
        );
        const data = await response.json();
        setAssignmentsCounts((prev) => ({
          ...prev,
          totalInterviews: data[0]?.totalInterviews || 0,
          todaysInterviews: data[0]?.todaysInterviews || 0,
          thisweeksInterviews: data[0]?.thisweeksInterviews || 0,
        }));
        setAssignedInterviewers([...data[0].assignmentCount]);
        if (isAppend) {
          setAssignments((prev) => [...prev, ...data[0].data]);
        } else {
          setAssignments(data[0]?.data);
        }

        if (data[0]?.data?.length < itemsPerPage) {
          setHasMoreData(false);
        } else {
          setHasMoreData(true);
        }
      } catch (error) {
        console.error("Error fetching assignments:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [filterText, selectedAssignedTo, itemsPerPage]
  );

  const loadMoreData = useCallback(() => {
    if (!hasMoreData || isLoadingMore || loadingRef.current) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchAssignments(nextPage, true);
  }, [currentPage, hasMoreData, isLoadingMore, fetchAssignments]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.9 && hasMoreData && !isLoadingMore) {
      loadMoreData();
    }
  }, [loadMoreData, hasMoreData, isLoadingMore]);

  const observerRef = useRef<IntersectionObserver>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreData) {
            loadMoreData();
          }
        },
        {
          threshold: 0.1,
          rootMargin: "100px",
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [isLoadingMore, hasMoreData, loadMoreData]
  );

  const checkUser = async () => {
    const user = Cookies.get("token");
    if (user) {
      const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
      if (decryptedResponse.success && decryptedResponse.user) {
        setUser(decryptedResponse.user);
      }
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setAssignments([]);
    fetchAssignments(1, false);
  }, [selectedAssignedTo, filterText]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const applyFilter = () => {
    setFilterText(searchText);
  };

  const interviewerAssignments = assignments?.filter((assignment) =>
    isInterviewer
      ? assignment.assignment?.interviewerId?.email === user?.email
      : assignment
  );

  const todayAssignments = interviewerAssignments?.filter((assignment) => {
    const assignmentDate = new Date(assignment.assignment.time);
    const today = new Date();
    return (
      assignmentDate.getDate() === today.getDate() &&
      assignmentDate.getMonth() === today.getMonth() &&
      assignmentDate.getFullYear() === today.getFullYear()
    );
  });

  const options = assignedInterviewers
    ?.map((usr) => ({
      label:
        usr.interviewerId === user?.id
          ? `Me (${usr.count})`
          : `${usr.name} (${usr.count})`,
      value: usr.interviewerId,
    }))
    ?.sort((a) => (a.label === "Me" ? -1 : 1));
  return (
    <div
      ref={scrollContainerRef}
      className="space-y-6 h-screen overflow-y-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex justify-start">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                assignmentsCounts?.totalInterviews
              )}
              {/* {isLoading ? (
                <LoadingSpinner />
              ) : isInterviewer ? (
                interviewerAssignments?.length
              ) : (
                assignments?.length
              )} */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex justify-start">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                assignmentsCounts?.thisweeksInterviews
              )}
              {/* {isLoading ? <LoadingSpinner /> : thisWeekAssignments?.length} */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex justify-start">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                assignmentsCounts?.todaysInterviews
              )}
              {/* {isLoading ? <LoadingSpinner /> : todayAssignments?.length} */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input and Filter Button */}
      <div className="mt-6 flex gap-2 items-center">
        <Input
          placeholder="Search assignments..."
          value={searchText}
          onChange={(e) => {
            const value = e.target.value;
            const sanitizedValue = value.replace(/[/\\*+?|{}[\]()^$]/g, "");
            setSearchText(sanitizedValue);
          }}
          className="max-w-md"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              applyFilter();
            }
          }}
        />
        <Button onClick={applyFilter}>Filter</Button>
        {(user?.role === "admin" || user?.role === "hr") && (
          <MultiSelect
            placeholder="Assign to"
            open={open}
            setOpen={setOpen}
            value={selectedAssignedTo}
            setValue={setSelectedAssignedTo}
            options={options}
          />
        )}
      </div>

      {shouldShowAssignments ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">All Assignments</h2>
          {isLoading ? (
            <DashboardLoader />
          ) : (
            <>
              {assignments?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignments.map((assignment, index) => (
                    <div
                      key={assignment.id || assignment._id}
                      ref={
                        index === assignments.length - 1 ? lastElementRef : null
                      }
                    >
                      <ActionItems
                        assignment={assignment}
                        fetchAssignments={() => fetchAssignments(1, false)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
                  No assignments found.
                </p>
              )}

              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
                <div className="flex justify-center items-center py-8">
                  <LoadingSpinner />
                  <span className="ml-2 text-gray-500">
                    Loading more assignments...
                  </span>
                </div>
              )}

              {/* End of data indicator */}
              {!hasMoreData && assignments.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>You've reached the end of the list</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Today's Interviews</h2>
            {isLoading ? (
              <DashboardLoader />
            ) : todayAssignments?.length > 0 ? (
              <RenderTodaysInterviews todayAssignments={todayAssignments} />
            ) : (
              <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
                No interviews scheduled for today.
              </p>
            )}
          </div>

          {isInterviewer && (
            <div>
              <h2 className="text-2xl font-bold mb-4">All My Assignments</h2>
              {isLoading ? (
                <DashboardLoader />
              ) : interviewerAssignments?.length > 0 ? (
                <RenderInterviewerAssignments
                  interviewerAssignments={interviewerAssignments}
                />
              ) : (
                <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
                  No assignments found.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
