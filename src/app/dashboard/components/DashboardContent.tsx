import { Candidate } from '@/types/candidate';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ActionItems from '@/components/actionitems';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import React from 'react';
import DashboardCards from './DashboardCards';
import { RenderInterviewerAssignments } from './RenderInterviewerAssignments';
import { RenderTodaysInterviews } from './RenderTodaysInterviews';

interface DashboardContentProps {
  isLoading: boolean;
  assignments: Candidate[] | null;
  assignmentsCounts: {
    [key: string]: number;
  };
  shouldShowAssignments: boolean;
  isInterviewer: boolean;
  assignmentsFiltered: Candidate[];
  sseCandidates: Candidate[];
  lastElementRef: (node: HTMLDivElement) => void;
  isLoadingMore: boolean;
  todayAssignments: Candidate[];
  interviewerAssignments: Candidate[];
  user: { id?: string; email?: string; role?: string } | null;
  scrollContainerRef:
    | React.RefObject<HTMLDivElement | null>
    | React.RefObject<HTMLDivElement>;
  showRecentActivities: boolean;
  isActivitiesSidebarOpen: boolean;
  setAssignments: React.Dispatch<React.SetStateAction<Candidate[]>>;
}

export function DashboardContent({
  isLoading,
  assignments,
  assignmentsCounts,
  shouldShowAssignments,
  isInterviewer,
  assignmentsFiltered,
  sseCandidates,
  lastElementRef,
  isLoadingMore,
  todayAssignments,
  interviewerAssignments,
  user,
  scrollContainerRef,
  showRecentActivities,
  isActivitiesSidebarOpen,
  setAssignments,
}: DashboardContentProps) {
  return (
    <div
      ref={scrollContainerRef}
      className={`space-y-6 overflow-y-auto ${
        showRecentActivities && isActivitiesSidebarOpen ? 'flex-1' : 'w-full'
      }`}
    >
      {isLoading || !assignments ? (
        <DashboardSkeleton role={user?.role || null} />
      ) : (
        <>
          <DashboardCards assignmentsCounts={assignmentsCounts} />

          {shouldShowAssignments ? (
            <div>
              {assignmentsFiltered.length > 0 ? (
                <div className="flex flex-wrap justify-start gap-6">
                  {assignmentsFiltered.map((assignment, index) => {
                    if(!assignment.assignment?.interviewerId) {
                      return null;
                    }
                    return <div
                      key={assignment.id || assignment._id}
                      ref={
                        index === assignmentsFiltered.length - 1
                          ? lastElementRef
                          : null
                      }
                    >
                      <ActionItems
                        assignment={
                          sseCandidates.find(
                            (candidate) => candidate._id === assignment._id,
                          ) || assignment
                        }
                        assignments={assignments || []}
                        setAssignments={setAssignments}
                      />
                    </div>
                  })}
                </div>
              ) : (
                <p className="flex w-full items-center justify-center py-10 text-center text-lg font-semibold text-gray-500">
                  No assignments found.
                </p>
              )}

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
                {todayAssignments.length > 0 ? (
                  <RenderTodaysInterviews
                    todayAssignments={
                      sseCandidates.length > 0
                        ? ([
                            ...sseCandidates.filter((candidate) => {
                              const isTodayAssignment =
                                candidate.assignment?.time &&
                                new Date(
                                  candidate.assignment.time,
                                ).toDateString() === new Date().toDateString();

                              return (
                                isTodayAssignment === true &&
                                candidate.assignment &&
                                typeof candidate.assignment.interviewerId ===
                                  'object' &&
                                candidate.assignment.interviewerId &&
                                '_id' in candidate.assignment.interviewerId &&
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
                                ).toDateString() === new Date().toDateString(),
                            ),
                          ] as Candidate[])
                        : todayAssignments.filter(
                            (assignment) =>
                              assignment.assignment?.time &&
                              new Date(
                                assignment.assignment.time,
                              ).toDateString() === new Date().toDateString(),
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
                  {interviewerAssignments.length > 0 ? (
                    <RenderInterviewerAssignments
                      interviewerAssignments={
                        sseCandidates.length > 0
                          ? ([
                              ...sseCandidates.filter(
                                (candidate) =>
                                  candidate.assignment &&
                                  typeof candidate.assignment.interviewerId ===
                                    'object' &&
                                  candidate.assignment.interviewerId &&
                                  '_id' in candidate.assignment.interviewerId &&
                                  candidate.assignment.interviewerId._id.toString() ===
                                    user?.id?.toString(),
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
  );
}
