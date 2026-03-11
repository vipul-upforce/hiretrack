import { Candidate } from '@/types/candidate';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import ActionItems from '@/components/actionitems';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import Link from 'next/link';
import React from 'react';
import { CalendarDays, ClipboardList, UserCheck } from 'lucide-react';
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
  onCandidateCardClick: (candidate: Candidate) => void;
  prependContent?: React.ReactNode;
}

function DashboardEmptyState({
  title,
  description,
  Icon,
  minHeight = 'min-h-[420px]',
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  minHeight?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={`w-full flex rounded-2xl justify-center items-center border border-border/70 bg-background/80 px-6 py-10 h-full ${minHeight} max-h-[100px]`}>
      <div className="flex min-h-full my-auto flex-col items-center justify-center text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
        {actionLabel && actionHref && (
          <div className="mt-6">
            <Button asChild variant="primary">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
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
  onCandidateCardClick,
  prependContent,
}: DashboardContentProps) {
  return (
    <div
      ref={scrollContainerRef}
      className={`space-y-6 overflow-y-auto ${
        showRecentActivities && isActivitiesSidebarOpen ? 'flex-1' : 'w-full'
      }`}
    >
      {prependContent}
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
                        assignments={assignmentsFiltered}
                        setAssignments={setAssignments}
                      />
                    </div>
                  })}
                </div>
              ) : (
                <DashboardEmptyState
                  title="No assignments yet"
                  description="You have not assigned any candidates to interviewers yet. Once assignments are created, this area will automatically populate with active interview cards."
                  Icon={ClipboardList}
                  minHeight="min-h-[76vh]"
                  actionLabel="Open Jobs Board"
                  actionHref="/dashboard/jobs-board"
                />
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
                    onCandidateClick={onCandidateCardClick}
                  />
                ) : (
                  <DashboardEmptyState
                    title="No interviews scheduled for today"
                    description="You are clear for today. Upcoming interviews will appear here as soon as they are assigned."
                    Icon={CalendarDays}
                    minHeight="min-h-[280px]"
                  />
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
                      onCandidateClick={onCandidateCardClick}
                    />
                  ) : (
                    <DashboardEmptyState
                      title="No active assignments"
                      description="You currently do not have any assigned candidates. New assignments will show up here automatically."
                      Icon={UserCheck}
                      minHeight="min-h-[320px]"
                    />
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
