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
import useRoles from "@/hooks/useRoles";
import { useSSE } from "@/hooks/useSSE";
import { Candidate } from "@/types/candidate";
import { ITag } from "@/lib/models/organization";
// import useRoles from "@/hooks/useRoles";
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
  tags?: ITag[];
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
  const itemsPerPage = 48;
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

  const role = useRoles();
  const { candidates: sseCandidates } = useSSE(role || "", () => {}, null);

  const isToday = (assignment: Assignment) => {
    const assignmentDate = new Date(
      assignment.assignment?.time || assignment.interviewDate
    );
    const today = new Date();
    return (
      assignmentDate.getDate() === today.getDate() &&
      assignmentDate.getMonth() === today.getMonth() &&
      assignmentDate.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (assignment: Assignment) => {
    const assignmentDate = new Date(
      assignment.assignment?.time || assignment.interviewDate
    );
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return assignmentDate >= startOfWeek && assignmentDate <= endOfWeek;
  };
  // const role = useRoles();
  // const { candidates: sseCandidates } = useSSE(
  //   role || "",
  //   setSelectedEvent,
  //   selectedEvent
  // );

  // const fetchAssignmentsNoReload = useCallback(
  //   async (page = currentPage, isAppend = false) => {
  //     if (loadingRef.current) return;

  //     loadingRef.current = true;
  //     // if (!isAppend) {
  //     //   setIsLoading(true);
  //     // } else {
  //     //   setIsLoadingMore(true);
  //     // }

  //     try {
  //       const params = new URLSearchParams({
  //         isPagination: "true",
  //         page: page.toString(),
  //         limit: itemsPerPage.toString(),
  //         filterValue: filterText.toString(),
  //         assignedTo: selectedAssignedTo,
  //       });

  //       const response = await fetch(
  //         `/api/candidates/assignments?${params.toString()}`
  //       );
  //       if (!response.ok) {
  //         const errorData = await response.json();
  //         throw new Error(errorData.error || "Failed to fetch assignments");
  //       }

  //       const data = await response.json();
  //       const newAssignments = data[0]?.data || [];
  //       setAssignmentsCounts({
  //         totalInterviews: data[0]?.totalInterviews || 0,
  //         todaysInterviews: data[0]?.todaysInterviews || 0,
  //         thisweeksInterviews: data[0]?.thisweeksInterviews || 0,
  //       });
  //       setAssignedInterviewers([...(data[0]?.assignmentCount || [])]);

  //       // Update assignments state
  //       if (isAppend) {
  //         setAssignments((prev) => [...prev, ...newAssignments]);
  //       } else {
  //         setAssignments(newAssignments);
  //       }

  //       // Update pagination state
  //       if (newAssignments.length < itemsPerPage) {
  //         setHasMoreData(false);
  //       } else {
  //         setHasMoreData(true);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching assignments:", error);
  //     } finally {
  //       setIsLoading(false);
  //       setIsLoadingMore(false);
  //       loadingRef.current = false;
  //     }
  //   },
  //   [filterText, selectedAssignedTo, itemsPerPage, currentPage]
  // );

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
        // debugger;
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
          // debugger;
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
    // debugger;
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
    const assignmentDate = new Date(assignment?.assignment?.time);
    const today = new Date();
    return (
      assignmentDate.getDate() === today.getDate() &&
      assignmentDate.getMonth() === today.getMonth() &&
      assignmentDate.getFullYear() === today.getFullYear()
    );
  });

  // useEffect(() => {
  //   if (sseCandidates && sseCandidates.length > 0) {
  //     setAssignments((prevAssignments) => {
  //       let updatedAssignments: Candidate[] | Assignment[] = [
  //         ...prevAssignments,
  //       ];
  //       (sseCandidates as Candidate[] | Assignment[]).forEach(
  //         (sseCandidate) => {
  //           // debugger;
  //           const candidateId = sseCandidate._id;
  //           const existingIndex = updatedAssignments.findIndex(
  //             (assignment) => (assignment._id || assignment.id) === candidateId
  //           );

  //           if (!sseCandidate.assignment) {
  //             if (existingIndex !== -1) {
  //               updatedAssignments = updatedAssignments.filter(
  //                 (_, index) => index !== existingIndex
  //               );
  //             }
  //           } else {
  //             if (existingIndex !== -1) {
  //               updatedAssignments[existingIndex] = {
  //                 ...updatedAssignments[existingIndex],
  //                 ...sseCandidate,
  //               };
  //             } else {
  //               updatedAssignments.push(sseCandidate);
  //             }
  //           }
  //         }
  //       );

  //       setAssignmentsCounts({
  //         totalInterviews: updatedAssignments.length,
  //         todaysInterviews: updatedAssignments.filter(isToday).length,
  //         thisweeksInterviews: updatedAssignments.filter(isThisWeek).length,
  //       });

  //       return updatedAssignments;
  //     });
  //   }
  // }, [sseCandidates]);

  useEffect(() => {
    if (sseCandidates && sseCandidates.length > 0) {
      setAssignments((prevAssignments) => {
        let updatedAssignments: Assignment[] = [...prevAssignments];

        (sseCandidates as (Candidate | Assignment)[]).forEach(
          (sseCandidate) => {
            // debugger;
            // Ensure the candidate has the required Assignment properties
            if ("assignment" in sseCandidate && sseCandidate._id) {
              const candidateId = sseCandidate._id;
              const existingIndex = updatedAssignments.findIndex(
                (assignment) =>
                  (assignment._id || assignment.id) === candidateId
              );

              if (!sseCandidate.assignment) {
                // Remove if assignment is null/undefined
                if (existingIndex !== -1) {
                  updatedAssignments = updatedAssignments.filter(
                    (_, index) => index !== existingIndex
                  );
                }
              } else {
                // Convert Candidate to Assignment or use directly if already Assignment
                const assignment: Assignment = {
                  id: sseCandidate._id!,
                  _id: sseCandidate._id,
                  candidateName: sseCandidate.name,
                  jobTitle: sseCandidate.jobId.title,
                  interviewDate: sseCandidate.assignment.time,
                  status: sseCandidate.status || "pending",
                  assignment: (sseCandidate as Assignment).assignment,
                  jobId: (sseCandidate as Assignment).jobId,
                  name: (sseCandidate as Assignment).name,
                  resume: (sseCandidate as Assignment).resume,
                  tracking: (sseCandidate as Assignment).tracking,
                  organizationId: sseCandidate.organizationId,
                  location: sseCandidate.location,
                  experience: sseCandidate.experience,
                  skills: sseCandidate.skills,
                  tags: sseCandidate.tags,
                  expectedCTC: sseCandidate.expectedCTC,
                  currentCTC: sseCandidate.currentCTC,
                  noticePeriod: sseCandidate.noticePeriod,
                  remarks: (() => {
                    const candidateRemarks = (sseCandidate as Candidate)
                      .remarks;
                    if (Array.isArray(candidateRemarks)) {
                      // If remarks is an array, take the first remark or provide a default
                      return (
                        candidateRemarks[0] || {
                          description: "",
                          date: new Date().toISOString(),
                          userId: { _id: "", name: "", email: "" },
                        }
                      );
                    }
                    // If remarks is a single object or undefined, return it or a default
                    return (
                      candidateRemarks || {
                        description: "",
                        date: new Date().toISOString(),
                        userId: { _id: "", name: "", email: "" },
                      }
                    );
                  })(),
                  attachments: (sseCandidate as Assignment).attachments,
                  customFields: (sseCandidate as Assignment).customFields,
                  createdAt: sseCandidate.createdAt,
                  updatedAt: sseCandidate.updatedAt,
                };

                if (existingIndex !== -1) {
                  updatedAssignments[existingIndex] = {
                    ...updatedAssignments[existingIndex],
                    ...assignment,
                  };
                } else {
                  if (filterText) updatedAssignments.push(assignment);
                }
              }
            } else {
              if (!sseCandidate.assignment) {
                // Remove if assignment is null/undefined
                const candidateId = sseCandidate._id;
                const existingIndex = updatedAssignments.findIndex(
                  (assignment) =>
                    (assignment._id || assignment.id) === candidateId
                );
                if (existingIndex !== -1) {
                  updatedAssignments = updatedAssignments.filter(
                    (_, index) => index !== existingIndex
                  );
                }
              }
            }
          }
        );

        setAssignmentsCounts({
          totalInterviews: updatedAssignments.length,
          todaysInterviews: updatedAssignments.filter(isToday).length,
          thisweeksInterviews: updatedAssignments.filter(isThisWeek).length,
        });

        return updatedAssignments;
      });
    }
  }, [sseCandidates]);

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
      className="space-y-6 h-screen overflow-y-auto px-4 mt-2 mb-4"
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
      <div className="mt-6 flex gap-2 items-center justify-end gap-4">
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
        <div className="flex gap-4">
          <Button onClick={applyFilter}>Filter</Button>
          {(user?.role === "admin" || user?.role === "hr") && (
            <MultiSelect
              placeholder="Assigned to"
              open={open}
              setOpen={setOpen}
              value={selectedAssignedTo}
              setValue={setSelectedAssignedTo}
              options={options}
            />
          )}
        </div>
      </div>

      {shouldShowAssignments ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">All Assignments</h2>
          {isLoading ? (
            <DashboardLoader />
          ) : (
            <>
              {
                // sseCandidates?.length > 0 ? (
                //   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                //     {sseCandidates.map((assignment, index) => (
                //       <div
                //         key={assignment.id || assignment._id}
                //         ref={
                //           index === sseCandidates.length - 1
                //             ? lastElementRef
                //             : null
                //         }
                //       >
                //         <ActionItems
                //           assignment={assignment}
                //           fetchAssignments={() => fetchAssignments(1, false)}
                //         />
                //       </div>
                //     ))}
                //   </div>
                // ) :

                assignments?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((assignment, index) => (
                      <div
                        key={assignment.id || assignment._id}
                        ref={
                          index === assignments.length - 1
                            ? lastElementRef
                            : null
                        }
                      >
                        <ActionItems
                          assignment={
                            sseCandidates.length > 0 &&
                            assignment._id === sseCandidates[0]._id
                              ? sseCandidates[0]
                              : assignment
                          }
                          assignments={assignments}
                          setAssignments={setAssignments}
                          fetchAssignments={() => {}}
                          // fetchAssignments={() => fetchAssignmentsNoReload()}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
                    No assignments found.
                  </p>
                )
              }

              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
                <div className="flex justify-center items-center py-8">
                  <LoadingSpinner />
                  <span className="ml-2 text-gray-500">
                    Loading more assignments...
                  </span>
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
              // <RenderTodaysInterviews
              //   todayAssignments={
              //     sseCandidates.length > 0
              //       ? ([
              //           ...sseCandidates.filter((candidate) => {
              //             // debugger;
              //             return (
              //               candidate.assignment &&
              //               typeof candidate.assignment.interviewerId ===
              //                 "object" &&
              //               "_id" in candidate.assignment.interviewerId &&
              //               candidate.assignment.interviewerId._id.toString() ===
              //                 user?.id?.toString()
              //             );
              //           }),

              //           ...todayAssignments.filter(
              //             (older) =>
              //               older.assignment &&
              //               !sseCandidates.some(
              //                 (latest) => latest._id === older._id
              //               )
              //           ),
              //         ] as (Candidate & Assignment)[])
              //       : todayAssignments
              //   }
              // />
              <RenderTodaysInterviews
                todayAssignments={
                  sseCandidates.length > 0
                    ? ([
                        ...sseCandidates.filter((candidate) => {
                          // Check if the interview is scheduled for today
                          const isToday =
                            candidate.assignment?.time &&
                            new Date(
                              candidate.assignment.time
                            ).toDateString() === new Date().toDateString();

                          // Keep existing conditions for interviewerId
                          return (
                            isToday &&
                            candidate.assignment &&
                            typeof candidate.assignment.interviewerId ===
                              "object" &&
                            "_id" in candidate.assignment.interviewerId &&
                            candidate.assignment.interviewerId._id.toString() ===
                              user?.id?.toString()
                          );
                        }),

                        ...todayAssignments.filter(
                          (older) =>
                            older.assignment &&
                            !sseCandidates.some(
                              (latest) => latest._id === older._id
                            ) &&
                            older.assignment?.time &&
                            new Date(older.assignment.time).toDateString() ===
                              new Date().toDateString()
                        ),
                      ] as (Candidate & Assignment)[])
                    : todayAssignments.filter((assignment) => {
                        return (
                          assignment.assignment?.time &&
                          new Date(
                            assignment.assignment.time
                          ).toDateString() === new Date().toDateString()
                        );
                      })
                }
              />
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
                  interviewerAssignments={
                    sseCandidates.length > 0
                      ? ([
                          ...sseCandidates.filter((candidate) => {
                            // debugger;
                            return (
                              candidate.assignment &&
                              typeof candidate.assignment.interviewerId ===
                                "object" &&
                              "_id" in candidate.assignment.interviewerId &&
                              candidate.assignment.interviewerId._id.toString() ===
                                user.id?.toString()
                            );
                          }),

                          ...interviewerAssignments.filter(
                            (older) =>
                              older.assignment &&
                              !sseCandidates.some(
                                (latest) => latest._id === older._id
                              )
                          ),
                        ] as (Candidate & Assignment)[])
                      : interviewerAssignments
                  }
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
