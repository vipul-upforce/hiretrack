'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ActionItems from '@/components/actionitems';
import { Button } from '@/components/ui/button';
import { Search, Bell } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import { useMarkNotificationAsReadMutation } from '@/lib/features/notifications/notificationsApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import {
  useLazyFetchAssignmentsQuery,
  useLazyFetchCandidateByIdQuery,
} from '@/lib/features/candidate/candidateApi';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import logger from '@/lib/logger';
import DashboardCards from './components/DashboardCards';
import { CandidateDetailsDialog } from './jobs/[id]/components/Dialogs/candidate-details-dialog';
import RecentActivities from './components/RecentActivities';
import { RenderInterviewerAssignments } from './components/RenderInterviewerAssignments';
import { RenderTodaysInterviews } from './components/RenderTodaysInterviews';
// import DashboardLoader from './components/dashboard-loader';

// export interface Assignment {
//   id: string;
//   _id?: string;
//   candidateName: string;
//   jobTitle: string;
//   interviewDate: string;
//   status: string;
//   contact: string;
//   assignment: {
//     assignedAt: string;
//     time: string;
//     name: string;
//     interviewerId: {
//       _id: string;
//       name: string;
//       email: string;
//     };
//     jobId: {
//       title: string;
//       skills: string[];
//       description: string;
//     };
//   };
//   jobId: {
//     _id: string;
//     title: string;
//     skills: string[];
//     description: string;
//   };
//   name: string;
//   resume: {
//     id: string;
//     name: string;
//     url: string;
//     type: string;
//     size: number;
//   };
//   tracking: {
//     createdAt: string;
//     updatedAt: string;
//   };
//   tags?: ITag[];
//   organizationId: string;
//   location: string;
//   experience: number;
//   relevantExperience: number;
//   skills: string[];
//   expectedCTC?: number;
//   currentCTC?: number;
//   noticePeriod: number;
//   remarks: {
//     description: string;
//     date: string;
//     userId: {
//       _id: string;
//       name: string;
//       email: string;
//     };
//   };
//   attachments: {
//     id: string;
//     name: string;
//     url: string;
//     type: string;
//     size: number;
//     _id: string;
//   }[];
//   isDeleted?: boolean;
//   customFields: { [key: string]: string };
//   createdAt: string;
//   updatedAt: string;
// }

interface Interviewer {
  count: number;
  interviewerId: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const itemsPerPage = 48;
  const [open, setOpen] = useState(false);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [assignments, setAssignments] = useState<Candidate[]>([]);
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
  const { user } = useAppSelector((state) => state.auth || {});
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();
  const [triggerFetchAssignments] = useLazyFetchAssignmentsQuery();
  const [isActivitiesSidebarOpen, setIsActivitiesSidebarOpen] = useState(() => {
    // Load preference from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard-notifications-sidebar');
      return stored === null ? true : stored === 'open';
    }
    return true;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const shouldShowAssignments = user?.role === 'admin' || user?.role === 'hr';
  const isInterviewer = user?.role === 'interviewer';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [markAsRead] = useMarkNotificationAsReadMutation();

  const { candidates: sseCandidates } = useSSE(() => {}, null);
  const isToday = (assignment: Candidate) => {
    const assignmentDate = new Date(
      assignment.assignment?.time || assignment.interviewDate || '',
    );
    const today = new Date();
    return (
      assignmentDate.getDate() === today.getDate() &&
      assignmentDate.getMonth() === today.getMonth() &&
      assignmentDate.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (assignment: Candidate) => {
    const assignmentDate = new Date(
      assignment.assignment?.time || assignment.interviewDate || '',
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
        const data = await triggerFetchAssignments({
          isPagination: true,
          page,
          limit: itemsPerPage,
          filterValue: filterText.toString(),
          assignedTo: selectedAssignedTo,
        }).unwrap();

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
        logger.error('Error fetching assignments:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },

    [filterText, selectedAssignedTo, itemsPerPage, triggerFetchAssignments],
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
          rootMargin: '100px',
        },
      );

      if (node) observerRef.current.observe(node);
    },
    [isLoadingMore, hasMoreData, loadMoreData],
  );

  useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setAssignments([]);
    fetchAssignments(1, false);
  }, [selectedAssignedTo, filterText, fetchAssignments]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return undefined;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const applyFilter = () => {
    setFilterText(searchText);
  };

  const interviewerAssignments = assignments?.filter((assignment) =>
    isInterviewer
      ? (assignment.assignment?.interviewerId as { email: string })?.email ===
        user?.email
      : assignment,
  );

  const todayAssignments = interviewerAssignments?.filter((assignment) => {
    const assignmentDate = new Date(assignment?.assignment?.time || '');
    const today = new Date();
    return (
      assignmentDate.getDate() === today.getDate() &&
      assignmentDate.getMonth() === today.getMonth() &&
      assignmentDate.getFullYear() === today.getFullYear()
    );
  });

  useEffect(() => {
    if (sseCandidates && sseCandidates.length > 0) {
      setAssignments((prevAssignments) => {
        let updatedAssignments: Candidate[] = [...prevAssignments];

        (sseCandidates as Candidate[]).forEach((sseCandidate) => {
          // debugger;
          // Ensure the candidate has the required Assignment properties
          if (
            'assignment' in sseCandidate &&
            sseCandidate._id &&
            sseCandidate.assignment &&
            'assignment.interviewerId' in sseCandidate.assignment
          ) {
            const candidateId = sseCandidate._id;
            const existingIndex = updatedAssignments.findIndex(
              (assignment) => (assignment._id || assignment.id) === candidateId,
            );

            if (!sseCandidate.assignment) {
              // Remove if assignment is null/undefined
              if (existingIndex !== -1) {
                updatedAssignments = updatedAssignments.filter(
                  (_, index) => index !== existingIndex,
                );
              }
            } else {
              // Convert Candidate to Assignment or use directly if already Assignment
              const assignment: Candidate = {
                id: sseCandidate._id!,
                _id: sseCandidate._id,
                email: sseCandidate.email,
                candidateName: sseCandidate.name,
                contact: sseCandidate.contact,
                jobTitle: sseCandidate.jobId.title,
                interviewDate: sseCandidate.assignment.time,
                status: sseCandidate.status || 'pending',
                assignment: (sseCandidate as Candidate).assignment,
                jobId: (sseCandidate as Candidate).jobId,
                name: (sseCandidate as Candidate).name,
                resume: (sseCandidate as Candidate).resume,
                tracking: (sseCandidate as Candidate).tracking,
                organizationId: sseCandidate.organizationId,
                location: sseCandidate.location,
                experience: sseCandidate.experience,
                relevantExperience: sseCandidate.relevantExperience,
                skills: sseCandidate.skills,
                tags: sseCandidate.tags,
                expectedCTC: sseCandidate.expectedCTC,
                currentCTC: sseCandidate.currentCTC,
                noticePeriod: sseCandidate.noticePeriod,
                remarks: (() => {
                  const candidateRemarks = (sseCandidate as Candidate).remarks;
                  if (Array.isArray(candidateRemarks)) {
                    // If remarks is an array, take the first remark or provide a default
                    return candidateRemarks;
                  }
                  // If remarks is a single object or undefined, return it or a default
                  return candidateRemarks || [];
                })(),
                attachments: (sseCandidate as Candidate).attachments,
                customFields: (sseCandidate as Candidate).customFields,
                createdAt: sseCandidate.createdAt,
                updatedAt: sseCandidate.updatedAt,
              };

              if (existingIndex !== -1) {
                updatedAssignments[existingIndex] = {
                  ...updatedAssignments[existingIndex],
                  ...assignment,
                };
              } else {
                updatedAssignments.push(assignment);
              }
            }
          } else if (
            !sseCandidate.assignment ||
            !sseCandidate.assignment.interviewerId
          ) {
            logger.log('No SSE assignment found');
            // Remove if assignment is null/undefined
            const candidateId = sseCandidate._id;
            const existingIndex = updatedAssignments.findIndex(
              (assignment) => (assignment._id || assignment.id) === candidateId,
            );
            if (existingIndex !== -1) {
              updatedAssignments = updatedAssignments.filter(
                (_, index) => index !== existingIndex,
              );
            }
          }
        });

        setAssignmentsCounts({
          totalInterviews: updatedAssignments.length,
          todaysInterviews: updatedAssignments.filter(isToday).length,
          thisweeksInterviews: updatedAssignments.filter(isThisWeek).length,
        });

        return [...updatedAssignments];
      });
    }
  }, [sseCandidates, filterText]);

  const options = assignedInterviewers
    ?.map((usr) => ({
      label:
        usr.interviewerId === user?.id
          ? `Me (${usr.count})`
          : `${usr.name} (${usr.count})`,
      value: usr.interviewerId,
    }))
    ?.sort((a) => (a.label === 'Me' ? -1 : 1));

  // Fetch notifications for admin and HR - use shared context from layout
  const showRecentActivities = user?.role === 'admin' || user?.role === 'hr';
  const { notifications, isLoading: notificationsLoading } =
    useNotificationsContext();

  // Save sidebar preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'dashboard-notifications-sidebar',
        isActivitiesSidebarOpen ? 'open' : 'closed',
      );
    }
  }, [isActivitiesSidebarOpen]);

  // Notification handlers
  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // For candidate-related and meeting notifications, open dialog
    if (
      (notification.relatedEntity === 'candidate' ||
        notification.relatedEntity === 'followup' ||
        notification.relatedEntity === 'checklist' ||
        notification.relatedEntity === 'meeting') &&
      notification.relatedId
    ) {
      try {
        const result = await fetchCandidateById(notification.relatedId);
        if (result.data) {
          setSelectedCandidate(result.data);
          setIsCandidateDialogOpen(true);
          return;
        }
      } catch (error) {
        logger.error('Failed to fetch candidate:', error);
        toast({
          title: 'Error',
          description: 'Failed to load candidate details',
          variant: 'destructive',
        });
      }
    }

    // For other notifications, navigate to the page
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <CardTitle className="line-clamp-2 text-xl font-bold md:mr-2">
              All Assignments
            </CardTitle>

            {/* Right Section - Search and Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search assignments..."
                  value={searchText}
                  onChange={(e) => {
                    // Sanitize the input first to prevenet special characters and then remove leading spaces.
                    let { value } = e.target;
                    value = value.replace(/[/\\*+?|{}[\]()^$]/g, '');
                    value = value.replace(/\s{2,}/g, ' ');
                    if (value.length > 1) value = value.trimStart();
                    setSearchText(value);
                  }}
                  className="w-96 max-w-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      applyFilter();
                    }
                  }}
                />
                <Button variant="secondary" onClick={applyFilter}>
                  <Search className="mr-2 h-4 w-4" />
                  Apply
                </Button>
                {(user?.role === 'admin' || user?.role === 'hr') && (
                  <MultiSelect
                    placeholder="Assigned to"
                    open={open}
                    setOpen={setOpen}
                    value={selectedAssignedTo}
                    setValue={setSelectedAssignedTo}
                    options={options}
                  />
                )}
                {showRecentActivities && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setIsActivitiesSidebarOpen(!isActivitiesSidebarOpen)
                    }
                    className="ml-2"
                    title={
                      isActivitiesSidebarOpen
                        ? 'Hide notifications'
                        : 'Show notifications'
                    }
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 gap-4 overflow-hidden px-4 pb-4">
        {/* Main Content Area */}
        <div
          ref={scrollContainerRef}
          className={`space-y-6 overflow-y-auto ${
            showRecentActivities && isActivitiesSidebarOpen
              ? 'flex-1'
              : 'w-full'
          }`}
        >
          {isLoading || !assignments ? (
            <DashboardSkeleton role={user?.role} />
          ) : (
            <>
              <DashboardCards assignmentsCounts={assignmentsCounts} />

              {shouldShowAssignments ? (
                <div>
                  {assignments?.length > 0 ? (
                    <div className="flex flex-wrap justify-start gap-6">
                      {assignments
                        .filter(
                          (assignment) =>
                            !(
                              assignment.isDeleted ||
                              assignment?.assignment?.interviewerId === null
                            ),
                        )
                        .map((assignment, index) => (
                          <div
                            key={assignment.id || assignment._id}
                            ref={
                              index === assignments.length - 1
                                ? lastElementRef
                                : null
                            }
                          >
                            <ActionItems
                              assignment={(() => {
                                const sseMatch = sseCandidates.find(
                                  (candidate) =>
                                    candidate._id === assignment._id,
                                );
                                return sseMatch || assignment;
                              })()}
                              assignments={assignments}
                              setAssignments={setAssignments}
                              fetchAssignments={() => {}}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="flex w-full items-center justify-center py-10 text-center text-lg font-semibold text-gray-500">
                      No assignments found.
                    </p>
                  )}

                  {/* Loading indicator for infinite scroll */}
                  {isLoadingMore && (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                      <span className="ml-2 text-gray-500">
                        Loading more assignments...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-8">
                  <div>
                    <h2 className="mb-4 text-2xl font-bold">
                      Today&apos;s Interviews
                    </h2>
                    {todayAssignments?.length > 0 ? (
                      <RenderTodaysInterviews
                        todayAssignments={
                          sseCandidates.length > 0
                            ? ([
                                ...sseCandidates.filter((candidate) => {
                                  // Check if the interview is scheduled for today
                                  const isTodayAssignment =
                                    candidate.assignment?.time &&
                                    new Date(
                                      candidate.assignment.time,
                                    ).toDateString() ===
                                      new Date().toDateString();

                                  // Keep existing conditions for interviewerId
                                  return (
                                    isTodayAssignment === true &&
                                    candidate.assignment &&
                                    typeof candidate.assignment
                                      .interviewerId === 'object' &&
                                    '_id' in
                                      candidate.assignment.interviewerId &&
                                    candidate.assignment.interviewerId._id.toString() ===
                                      user?.id?.toString()
                                  );
                                }),

                                ...todayAssignments.filter(
                                  (older) =>
                                    older.assignment &&
                                    !sseCandidates.some(
                                      (latest) => latest._id === older._id,
                                    ) &&
                                    older.assignment?.time &&
                                    new Date(
                                      older.assignment.time,
                                    ).toDateString() ===
                                      new Date().toDateString(),
                                ),
                              ] as Candidate[])
                            : todayAssignments.filter(
                                (assignment) =>
                                  assignment.assignment?.time &&
                                  new Date(
                                    assignment.assignment.time,
                                  ).toDateString() ===
                                    new Date().toDateString(),
                              )
                        }
                      />
                    ) : (
                      <p className="flex w-full items-center justify-center py-10 text-center text-lg font-semibold text-gray-500">
                        No interviews scheduled for today.
                      </p>
                    )}
                  </div>

                  {isInterviewer && (
                    <div>
                      <h2 className="mb-4 text-2xl font-bold">
                        All My Assignments
                      </h2>
                      {interviewerAssignments?.length > 0 ? (
                        <RenderInterviewerAssignments
                          interviewerAssignments={
                            sseCandidates.length > 0
                              ? ([
                                  ...sseCandidates.filter(
                                    (candidate) =>
                                      candidate.assignment &&
                                      typeof candidate.assignment
                                        .interviewerId === 'object' &&
                                      '_id' in
                                        candidate.assignment.interviewerId &&
                                      candidate.assignment.interviewerId._id.toString() ===
                                        user.id?.toString(),
                                  ),

                                  ...interviewerAssignments.filter(
                                    (older) =>
                                      older.assignment &&
                                      !sseCandidates.some(
                                        (latest) => latest._id === older._id,
                                      ),
                                  ),
                                ] as Candidate[])
                              : interviewerAssignments
                          }
                        />
                      ) : (
                        <p className="flex w-full items-center justify-center py-10 text-center text-lg font-semibold text-gray-500">
                          No assignments found.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent Notifications Sidebar - Only for Admin and HR */}
        {showRecentActivities && isActivitiesSidebarOpen && (
          <div className="w-96 flex-shrink-0 overflow-y-auto">
            <RecentActivities
              notifications={notifications}
              isLoading={notificationsLoading}
              onNotificationClick={handleNotificationClick}
            />
          </div>
        )}
      </div>

      {/* Candidate Details Dialog */}
      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isCandidateDialogOpen}
        onOpenChange={setIsCandidateDialogOpen}
        onUpdate={() => {
          if (selectedCandidate) {
            fetchCandidateById(selectedCandidate._id);
          }
        }}
        hideEditButton={user?.role === 'interviewer'}
        hideCloseButtons={false}
      />
    </div>
  );
}
