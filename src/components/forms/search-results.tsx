"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  UserPlus,
  Edit,
  MessageSquare,
  Briefcase,
  Info,
  Plus,
  User,
  MapPin,
  Star,
  Calendar,
  Clock,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { JobDetailsDialog } from "@/app/dashboard/jobs-board/components/job-details-dialog";
import { EditCandidateDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/edit-candidate-dialog";
import { AssignCandidateDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-dialog";
import { AssignJobDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/assign-job-dialog";
import AddRemarksDialog from "@/app/dashboard/jobs/[id]/components/Dialogs/add-remark-dialog";
import { useState } from "react";
import { Candidate } from "@/types/candidate";
import { itemsPerPage } from "./candidate-search";
import { useEffect } from "react";

interface SearchResultsProps {
  results: Candidate[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  refetch: () => Promise<void>;
  totalResultsCount?: number;
}

export function SearchResults({
  results,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
  refetch,
  totalResultsCount,
}: SearchResultsProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(
    null
  );
  const [isAssignInterviewerOpen, setIsAssignInterviewerOpen] = useState(false);
  const [candidateToAssignInterviewer, setCandidateToAssignInterviewer] =
    useState<Candidate | null>(null);
  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);
  const [candidateToAssignJob, setCandidateToAssignJob] =
    useState<Candidate | null>(null);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [candidateToAddRemark, setCandidateToAddRemark] =
    useState<Candidate | null>(null);

  // Quick filter states
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<Candidate[]>(results);

  // Filter functions
  const applyFilters = (candidates: Candidate[], filters: string[]) => {
    if (filters.length === 0) return candidates;

    return candidates.filter((candidate) => {
      return filters.every((filter) => {
        switch (filter) {
          case "top-scorer":
            return candidate.scores?.overall >= 7;
          case "unassigned":
            return !candidate.jobId || typeof candidate.jobId !== "object";
          case "interview-scheduled":
            const hasValidInterviewer =
              candidate.assignment &&
              candidate.assignment.interviewerId &&
              typeof candidate.assignment.interviewerId === "object" &&
              candidate.assignment.interviewerId._id &&
              candidate.assignment.interviewerId.name;
            return hasValidInterviewer;
          case "exp-1+":
            return candidate.experience >= 1;
          case "exp-3+":
            return candidate.experience >= 3;
          case "exp-5+":
            return candidate.experience >= 5;
          case "applied-this-week":
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(candidate.createdAt) >= oneWeekAgo;
          case "applied-this-month":
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            return new Date(candidate.createdAt) >= oneMonthAgo;
          default:
            return true;
        }
      });
    });
  };

  // Apply filters when results or activeFilters change
  useEffect(() => {
    setFilteredResults(applyFilters(results, activeFilters));
  }, [results, activeFilters]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      name: true,
      skills: false,
      location: true,
      jobAssignment: true,
      overallScore: true,
      expectedCTC: true,
      currentCTC: true,
      experience: true,
      createdAt: true,
      actions: true,
    }
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleViewDetails = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCandidate(candidate);
    setIsDialogOpen(true);
  };

  const handleEdit = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setCandidateToEdit(candidate);
    setIsEditDialogOpen(true);
  };

  const handleAssignInterviewer = (
    candidate: Candidate,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setCandidateToAssignInterviewer(candidate);
    setIsAssignInterviewerOpen(true);
  };

  const handleAssignJob = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setCandidateToAssignJob(candidate);
    setIsAssignJobOpen(true);
  };

  const handleAddRemark = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setCandidateToAddRemark(candidate);
    setIsAddRemarkOpen(true);
  };

  const handleJobClick = (jobData: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJob(jobData);
    setIsJobDialogOpen(true);
  };

  const getJobAssignmentInfo = (candidate: Candidate) => {
    if (
      candidate.jobId &&
      typeof candidate.jobId === "object" &&
      candidate.jobId.title
    ) {
      // Check if assignment exists and has valid interviewer data
      const hasValidInterviewer =
        candidate.assignment &&
        candidate.assignment.interviewerId &&
        typeof candidate.assignment.interviewerId === "object" &&
        candidate.assignment.interviewerId._id &&
        candidate.assignment.interviewerId.name;

      return {
        isAssigned: true,
        jobTitle: candidate.jobId.title,
        hasInterview: hasValidInterviewer,
      };
    }
    return {
      isAssigned: false,
      jobTitle: null,
      hasInterview: false,
    };
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">Loading results...</div>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          No results found. Try adjusting your search criteria.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              Quick Filters:
            </span>
            <Button
              variant={
                activeFilters.includes("top-scorer") ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("top-scorer")}
              className="text-xs"
            >
              Top Scorer
            </Button>
            <Button
              variant={
                activeFilters.includes("unassigned") ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("unassigned")}
              className="text-xs"
            >
              Unassigned
            </Button>
            <Button
              variant={
                activeFilters.includes("interview-scheduled")
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("interview-scheduled")}
              className="text-xs"
            >
              Interview Scheduled
            </Button>
            <Button
              variant={
                activeFilters.includes("exp-1+") ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("exp-1+")}
              className="text-xs"
            >
              Exp 1+
            </Button>
            <Button
              variant={
                activeFilters.includes("exp-3+") ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("exp-3+")}
              className="text-xs"
            >
              Exp 3+
            </Button>
            <Button
              variant={
                activeFilters.includes("exp-5+") ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("exp-5+")}
              className="text-xs"
            >
              Exp 5+
            </Button>
            <Button
              variant={
                activeFilters.includes("applied-this-week")
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("applied-this-week")}
              className="text-xs"
            >
              This Week
            </Button>
            <Button
              variant={
                activeFilters.includes("applied-this-month")
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() => toggleFilter("applied-this-month")}
              className="text-xs"
            >
              This Month
            </Button>
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Columns Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {Object.entries(visibleColumns).map(([key, value]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [key]: !!checked,
                    }))
                  }
                >
                  {key === "jobAssignment"
                    ? "Job Assignment"
                    : key === "overallScore"
                      ? "Overall Score"
                      : key === "actions"
                        ? "Actions"
                        : key.toLocaleUpperCase()}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Count Display Above Table */}
        <div className="px-4 py-2 bg-muted/20 border-b">
          <div className="text-sm text-muted-foreground">
            {activeFilters.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {filteredResults.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {results.length}
                </span>{" "}
                results
                {activeFilters.length > 0 && (
                  <span className="ml-2">
                    (filtered by:{" "}
                    {activeFilters
                      .map((f) =>
                        f
                          .replace("-", " ")
                          .replace(/([A-Z])/g, " $1")
                          .trim()
                      )
                      .join(", ")}
                    )
                  </span>
                )}
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {results.length}
                </span>{" "}
                results
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                {visibleColumns.name && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Name</span>
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.skills && (
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>Skills</span>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.location && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("location")}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Location</span>
                      {getSortIcon("location")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.jobAssignment && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("jobAssignment")}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>Job Assignment</span>
                      {getSortIcon("jobAssignment")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.overallScore && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("overallScore")}
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span>Overall Score</span>
                      {getSortIcon("overallScore")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.expectedCTC && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("expectedCTC")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">
                        ₹
                      </span>
                      <span>ECTC</span>
                      {getSortIcon("expectedCTC")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.currentCTC && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("currentCTC")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">
                        ₹
                      </span>
                      <span>CCTC</span>
                      {getSortIcon("currentCTC")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.experience && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("experience")}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Exp</span>
                      {getSortIcon("experience")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.createdAt && (
                  <TableHead
                    className="cursor-pointer font-semibold text-foreground"
                    onClick={() => onSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Applied</span>
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.actions && (
                  <TableHead className="w-[50px] font-semibold text-foreground">
                    <div className="flex items-center justify-center">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((candidate) => {
                const jobInfo = getJobAssignmentInfo(candidate);
                return (
                  <TableRow
                    key={candidate._id}
                    className="hover:bg-muted/50 cursor-pointer"
                  >
                    {visibleColumns.name && (
                      <TableCell className="font-medium">
                        <span
                          className="font-bold text-primary cursor-pointer hover:text-primary/80 hover:underline transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(candidate, e);
                          }}
                        >
                          {candidate.name}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.skills && (
                      <TableCell className="w-[30%]">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 5).map((skill: string) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 5 && (
                            <Badge
                              variant="secondary"
                              className="text-xs text-muted-foreground"
                            >
                              +{candidate.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.location && (
                      <TableCell>{candidate.location}</TableCell>
                    )}
                    {visibleColumns.jobAssignment && (
                      <TableCell>
                        {jobInfo.isAssigned ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              onClick={(e) =>
                                handleJobClick(candidate.jobId, e)
                              }
                            >
                              {jobInfo.jobTitle}
                            </Badge>
                            {jobInfo.hasInterview && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              >
                                Interview Scheduled
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground border-muted-foreground/30 bg-muted/30"
                          >
                            Not Assigned
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.overallScore && (
                      <TableCell>
                        {candidate.scores ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-medium bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                              >
                                Overall: {candidate.scores.overall}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {candidate.scores.experience !== undefined && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                >
                                  Exp: {candidate.scores.experience}
                                </Badge>
                              )}
                              {candidate.scores.skills !== undefined && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                >
                                  Skills: {candidate.scores.skills}
                                </Badge>
                              )}
                              {candidate.scores.affordability !== undefined && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                                >
                                  Afford: {candidate.scores.affordability}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground border-muted-foreground/30 bg-muted/30"
                          >
                            No Score
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.expectedCTC && (
                      <TableCell>
                        {formatCurrency(candidate?.expectedCTC ?? 0)}
                      </TableCell>
                    )}
                    {visibleColumns.currentCTC && (
                      <TableCell>
                        {formatCurrency(candidate?.currentCTC ?? 0)}
                      </TableCell>
                    )}
                    {visibleColumns.experience && (
                      <TableCell>{candidate.experience} years</TableCell>
                    )}
                    {visibleColumns.createdAt && (
                      <TableCell>
                        {format(
                          new Date(candidate.tracking?.createdAt || Date.now()),
                          "MMM d, yyyy"
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleViewDetails(candidate, e)}
                            >
                              <Info className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleEdit(candidate, e)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleAssignInterviewer(candidate, e)
                              }
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Assign Interviewer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleAssignJob(candidate, e)}
                            >
                              <Briefcase className="mr-2 h-4 w-4" />
                              Assign Job
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleAddRemark(candidate, e)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Remark
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Results Count Display */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {activeFilters.length > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {filteredResults.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {results.length}
                  </span>{" "}
                  results
                  {activeFilters.length > 0 && (
                    <span className="ml-2">
                      (filtered by:{" "}
                      {activeFilters
                        .map((f) =>
                          f
                            .replace("-", " ")
                            .replace(/([A-Z])/g, " $1")
                            .trim()
                        )
                        .join(", ")}
                      )
                    </span>
                  )}
                </>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {results.length}
                  </span>{" "}
                  results
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedCandidate && (
        <CandidateDetailsDialog
          candidate={selectedCandidate}
          isOpen={isDialogOpen}
          fromFilter={true}
          onOpenChange={setIsDialogOpen}
          refetchCandidates={refetch}
        />
      )}

      {candidateToEdit && (
        <EditCandidateDialog
          candidate={candidateToEdit}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdate={(updatedCandidate) => {
            // Handle candidate update
            console.log("Candidate updated:", updatedCandidate);
            refetch();
          }}
          refetchAssignment={refetch}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setCandidateToEdit(null);
            refetch();
          }}
        />
      )}

      {candidateToAssignInterviewer && (
        <AssignCandidateDialog
          candidate={candidateToAssignInterviewer}
          isOpen={isAssignInterviewerOpen}
          onOpenChange={setIsAssignInterviewerOpen}
          refetch={refetch}
          onUpdate={(updatedCandidate) => {
            console.log("Candidate assigned:", updatedCandidate);
            refetch();
          }}
          setLocalCandidate={() => {}}
          onSuccess={() => {
            setIsAssignInterviewerOpen(false);
            setCandidateToAssignInterviewer(null);
            refetch();
          }}
        />
      )}

      {candidateToAssignJob && (
        <AssignJobDialog
          candidate={candidateToAssignJob}
          isOpen={isAssignJobOpen}
          onOpenChange={setIsAssignJobOpen}
          onJobAssignment={() => {
            setIsAssignJobOpen(false);
            setCandidateToAssignJob(null);
            refetch();
          }}
        />
      )}

      {candidateToAddRemark && (
        <AddRemarksDialog
          candidate={candidateToAddRemark}
          isOpen={isAddRemarkOpen}
          onOpenChange={setIsAddRemarkOpen}
          setOpenRemarksFor={() => {}}
          refetch={refetch}
        />
      )}

      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          isOpen={isJobDialogOpen}
          onOpenChange={setIsJobDialogOpen}
          userRole="admin"
          onJobUpdate={() => {
            // TODO: Implement job update functionality
            console.log("Job updated:", selectedJob);
          }}
        />
      )}
    </>
  );
}
