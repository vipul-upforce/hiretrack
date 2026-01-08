'use client';

import { Card, CardContent } from '@/components/ui/card';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { CandidateStatus, Assignment, Candidate } from '@/types/candidate';
import LoaderSkeletonCalender from './components/loader-skeleton-calender';
import { formatTime } from '../jobs/[id]/hooks/dateTimeFormatting';
import { CandidateDetailsDialog } from '../jobs/[id]/components/Dialogs/candidate-details-dialog';
import { StatsCards } from './components/stats-cards';
import { CalendarSidebar } from './components/calendar-sidebar';
import { useCalendar } from './hooks/useCalendar';
import './calendar.css';

interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  skills?: string[];
}

export interface CandidateAssignment {
  _id: string;
  name: string;
  jobId: Job | string;
  jobDetails?: {
    title: string;
    description: string;
  };
  location: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  } | null;
  assignment: Assignment | null;
  remarks?: Array<{
    description: string;
    date: string;
    rating?: number;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  }>;
  status?: CandidateStatus;
  tracking?: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface CustomCalendarEvent {
  id: string;
  title: string;
  start?: Date;
  end?: Date;
  allDay: boolean;
  startStr: string;
  endStr: string;
  url: string;
  display: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    candidate: CandidateAssignment;
    interviewer: Interviewer;
  };
}

export default function CalendarPage() {
  const {
    selectedEvent,
    isDetailsOpen,
    setIsDetailsOpen,
    calendarRef,
    searchText,
    setSearchText,
    filterText,
    setFilterText,
    selectedDate,
    setSelectedDate,
    calendarView,
    isLoading,
    events,
    todayCount,
    thisWeekCount,
    totalInterviews,
    upcomingCount,
    applyFilter,
    handleEventClick,
    handleSidebarEventClick,
    handleDateClick,
    handleDateSelect,
    handleViewChange,
    handleUpdate,
  } = useCalendar();

  if (isLoading) {
    return <LoaderSkeletonCalender />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Interview Calendar
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage interviews, screenings, assignments, and follow-ups
              </p>
            </div>
          </div>

          {/* Search + View Switch */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-between">
            {/* Search */}
            <div className="flex w-full gap-2 sm:w-auto">
              <Input
                placeholder="Search by name, job, or skills..."
                value={searchText}
                onChange={(e) => {
                  const value = e.target.value.replace(
                    /[\/\\*+\?|\{\}\[\]()^$\.]/g,
                    '',
                  );
                  setSearchText(value);
                }}
                className="flex-1 sm:w-64"
                onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
              />

              <Button variant="outline" size="icon" onClick={applyFilter}>
                <Search className="h-4 w-4" />
              </Button>

              {filterText && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFilterText('');
                    setSearchText('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Views */}
            <div className="flex gap-1 overflow-hidden rounded-lg border p-1">
              <Button
                variant={calendarView === 'dayGridMonth' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('dayGridMonth')}
              >
                Month
              </Button>
              <Button
                variant={calendarView === 'timeGridWeek' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('timeGridWeek')}
              >
                Week
              </Button>
              <Button
                variant={calendarView === 'timeGridDay' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('timeGridDay')}
              >
                Day
              </Button>
              <Button
                variant={calendarView === 'listWeek' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('listWeek')}
              >
                Agenda
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* BODY scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="px-4 pb-6 pt-4 sm:px-6">
          <StatsCards
            todayCount={todayCount}
            thisWeekCount={thisWeekCount}
            totalInterviews={totalInterviews}
            upcomingCount={upcomingCount}
          />
        </div>

        {/* Main Content */}
        <div className="px-4 pb-6 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
            {/* Sidebar */}
            <div className="min-h-0">
              <CalendarSidebar
                events={events}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onEventClick={handleSidebarEventClick}
              />
            </div>

            {/* Calendar */}
            <Card className="flex h-full min-h-[500px] flex-col border border-border/50">
              <CardContent className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    listPlugin,
                    interactionPlugin,
                  ]}
                  initialView={calendarView}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: '',
                  }}
                  customButtons={{
                    today: {
                      text: 'Today',
                      click: () => {
                        calendarRef.current?.getApi().today();
                        setSelectedDate(new Date());
                      },
                    },
                  }}
                  height="100%"
                  contentHeight="100%"
                  handleWindowResize
                  nowIndicator
                  allDaySlot={false}
                  eventTextColor="#fff"
                  slotMinTime="00:00:00"
                  slotMaxTime="24:00:00"
                  // eslint-disable-next-line react/no-unstable-nested-components
                  eventContent={(arg) => {
                    const extendedProps = arg.event.extendedProps as {
                      candidate: CandidateAssignment;
                      interviewer: { _id: string; name: string; email: string };
                    };
                    const { candidate, interviewer } = extendedProps;

                    const jobTitle =
                      typeof candidate.jobId !== 'string' &&
                      candidate.jobId?.title
                        ? candidate.jobId.title
                        : candidate.jobDetails?.title || '';

                    const currentView = arg.view.type;

                    if (currentView === 'listWeek') {
                      return (
                        <div className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {candidate.name}
                            </span>
                            {jobTitle && (
                              <span className="text-xs text-muted-foreground">
                                • {jobTitle}
                              </span>
                            )}
                          </div>
                          {interviewer.name &&
                            interviewer.name !== 'Unknown' && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="font-medium">
                                  Interviewer:
                                </span>
                                {interviewer.name}
                              </div>
                            )}
                        </div>
                      );
                    }

                    if (
                      currentView === 'timeGridWeek' ||
                      currentView === 'timeGridDay'
                    ) {
                      return (
                        <div className="h-full w-full overflow-hidden break-words px-2 py-1">
                          <div className="mb-0.5 flex max-w-full items-center gap-1 overflow-hidden">
                            <div className="min-w-0 flex-1 overflow-hidden truncate text-[11px] font-medium">
                              {candidate.name}
                            </div>
                            {arg.event.start && (
                              <span className="shrink-0 whitespace-nowrap text-[10px] opacity-80">
                                {formatTime(arg.event.start)}
                              </span>
                            )}
                          </div>
                          {jobTitle && (
                            <div className="max-w-full overflow-hidden truncate text-[10px] capitalize opacity-80">
                              {jobTitle}
                            </div>
                          )}
                          {interviewer.name &&
                            interviewer.name !== 'Unknown' && (
                              <div className="max-w-full overflow-hidden truncate text-[10px] capitalize opacity-75">
                                {interviewer.name}
                              </div>
                            )}
                        </div>
                      );
                    }

                    // Month view
                    return (
                      <div className="h-full w-full overflow-hidden break-words px-1.5 py-0.5">
                        <div className="mb-0.5 flex max-w-full items-center gap-1 overflow-hidden">
                          <div className="min-w-0 flex-1 overflow-hidden truncate text-[11px] font-medium">
                            {candidate.name}
                          </div>
                          {arg.event.start && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] opacity-80">
                              {formatTime(arg.event.start)}
                            </span>
                          )}
                        </div>
                        {jobTitle && (
                          <div className="max-w-full overflow-hidden truncate text-[9px] capitalize opacity-75">
                            {jobTitle}
                          </div>
                        )}
                        {interviewer.name && interviewer.name !== 'Unknown' && (
                          <div className="max-w-full overflow-hidden truncate text-[9px] capitalize opacity-70">
                            {interviewer.name}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Candidate Dialog */}
      {selectedEvent && 'extendedProps' in selectedEvent && (
        <CandidateDetailsDialog
          candidate={
            {
              ...selectedEvent.extendedProps.candidate,
              jobId: {
                _id:
                  typeof selectedEvent.extendedProps.candidate.jobId ===
                  'string'
                    ? selectedEvent.extendedProps.candidate.jobId
                    : selectedEvent.extendedProps.candidate.jobId?._id || '',
                title:
                  selectedEvent.extendedProps.candidate.jobDetails?.title ||
                  (typeof selectedEvent.extendedProps.candidate.jobId ===
                    'object' &&
                  selectedEvent.extendedProps.candidate.jobId !== null
                    ? selectedEvent.extendedProps.candidate.jobId.title
                    : '') ||
                  '',
                description:
                  selectedEvent.extendedProps.candidate.jobDetails
                    ?.description ||
                  (typeof selectedEvent.extendedProps.candidate.jobId ===
                    'object' &&
                  selectedEvent.extendedProps.candidate.jobId !== null
                    ? selectedEvent.extendedProps.candidate.jobId.description
                    : '') ||
                  '',
                skills:
                  typeof selectedEvent.extendedProps.candidate.jobId ===
                    'object' &&
                  selectedEvent.extendedProps.candidate.jobId !== null
                    ? selectedEvent.extendedProps.candidate.jobId.skills || []
                    : [],
              },
              status: selectedEvent.extendedProps.candidate.status || 'applied',
              assignment: {
                ...selectedEvent.extendedProps.candidate.assignment,
                interviewerId:
                  selectedEvent.extendedProps.candidate.assignment
                    ?.interviewerId || '',
                time:
                  selectedEvent.start?.toISOString() ||
                  selectedEvent.extendedProps.candidate.assignment?.time ||
                  new Date().toISOString(),
                assignedAt:
                  selectedEvent.extendedProps.candidate.assignment
                    ?.assignedAt || new Date().toISOString(),
                googleMeet:
                  selectedEvent.extendedProps.candidate.assignment
                    ?.googleMeet || undefined,
              } as Assignment,
            } as unknown as Candidate
          }
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onUpdate={handleUpdate}
          refetchAssignment={handleUpdate}
          hideEditButton
        />
      )}
    </div>
  );
}
