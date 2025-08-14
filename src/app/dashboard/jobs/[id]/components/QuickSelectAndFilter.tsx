"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  ChevronDown,
  X,
  Star,
  Calendar,
  Clock,
  MessageSquare,
  UserCheck,
  UserX,
  FileText,
  FileX,
  Target,
} from "lucide-react";
import { Job } from "@/types/job";
import { Candidate } from "@/types/candidate";
import { useRouter } from "next/navigation";
import { useFetchJobsQuery } from "@/lib/features/job/jobApi";

interface FilterState {
  search: string;
  logicalOperator: "AND" | "OR";
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
}

interface QuickSelectAndFilterProps {
  currentJobId: string;
  candidates: Candidate[];
  onFilterChange: (filterConditions: FilterState) => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
}

export function QuickSelectAndFilter({
  currentJobId,
  candidates,
  onFilterChange,
  showArchived,
  onShowArchivedChange,
}: QuickSelectAndFilterProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    logicalOperator: "AND",
    topCandidates: false,
    appliedThisWeek: false,
    appliedToday: false,
    appliedIn15Days: false,
    toFollowUp: false,
    assigned: false,
    notAssigned: false,
    withRemarks: false,
    withoutRemarks: false,
  });

  const { data: jobs } = useFetchJobsQuery(undefined);

  // Compute filtered candidates for display purposes (e.g., count)
  const filteredCandidates = useMemo(() => {
    let filtered = [...candidates];

    // Apply archived filter
    filtered = filtered.filter(
      (candidate) => showArchived || !candidate.isDeleted
    );

    // Apply text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((candidate) => {
        return (
          candidate.name.toLowerCase().includes(searchLower) ||
          candidate.skills.some((skill) =>
            skill.toLowerCase().includes(searchLower)
          ) ||
          candidate.experience.toString().includes(searchLower) ||
          (candidate.assignment?.interviewerId as any)?.name
            ?.toLowerCase()
            .includes(searchLower) ||
          candidate.location.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply other filters
    const activeFilters = [
      {
        key: "topCandidates",
        filter: (candidate: Candidate) =>
          candidate.scores?.overall && candidate.scores.overall >= 7,
      },
      {
        key: "appliedThisWeek",
        filter: (candidate: Candidate) => {
          if (!candidate.tracking?.createdAt) return false;
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return new Date(candidate.tracking.createdAt) >= oneWeekAgo;
        },
      },
      {
        key: "appliedToday",
        filter: (candidate: Candidate) => {
          if (!candidate.tracking?.createdAt) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return (
            new Date(candidate.tracking.createdAt) >= today &&
            new Date(candidate.tracking.createdAt) < tomorrow
          );
        },
      },
      {
        key: "appliedIn15Days",
        filter: (candidate: Candidate) => {
          if (!candidate.tracking?.createdAt) return false;
          const fifteenDaysAgo = new Date();
          fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
          return new Date(candidate.tracking.createdAt) >= fifteenDaysAgo;
        },
      },
      {
        key: "toFollowUp",
        filter: (candidate: Candidate) =>
          candidate.followUp && candidate.followUp.note,
      },
      {
        key: "assigned",
        filter: (candidate: Candidate) => candidate.assignment,
      },
      {
        key: "notAssigned",
        filter: (candidate: Candidate) => !candidate.assignment,
      },
      {
        key: "withRemarks",
        filter: (candidate: Candidate) =>
          candidate.remarks && candidate.remarks.length > 0,
      },
      {
        key: "withoutRemarks",
        filter: (candidate: Candidate) =>
          !candidate.remarks || candidate.remarks.length === 0,
      },
    ].filter((filter) => filters[filter.key as keyof FilterState] === true);

    if (activeFilters.length > 0) {
      if (filters.logicalOperator === "AND") {
        filtered = filtered.filter((candidate) =>
          activeFilters.every(({ filter }) => filter(candidate))
        );
      } else {
        filtered = filtered.filter((candidate) =>
          activeFilters.some(({ filter }) => filter(candidate))
        );
      }
    }

    return filtered;
  }, [candidates, filters, showArchived]);

  // Update parent with filter conditions
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Group jobs by status and get candidate counts
  const groupedJobs = useMemo(() => {
    if (!jobs) return { open: [], draft: [], closed: [] };

    return jobs.reduce(
      (acc, job) => {
        if (job.isDeleted) {
          acc.closed.push(job);
        } else if (job.status === "open") {
          acc.open.push(job);
        } else {
          acc.draft.push(job);
        }
        return acc;
      },
      { open: [], draft: [], closed: [] } as Record<string, Job[]>
    );
  }, [jobs]);

  // Get candidate counts for each job
  const jobCandidateCounts = useMemo(() => {
    if (!jobs) return {};

    const counts: Record<string, number> = {};
    jobs.forEach((job) => {
      counts[job._id] = job.candidateCount || 0;
    });

    return counts;
  }, [jobs]);

  const handleJobSelect = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const handleFilterToggle = (filterKey: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      logicalOperator: "AND",
      topCandidates: false,
      appliedThisWeek: false,
      appliedToday: false,
      appliedIn15Days: false,
      toFollowUp: false,
      assigned: false,
      notAssigned: false,
      withRemarks: false,
      withoutRemarks: false,
    });
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) =>
      key !== "search" &&
      key !== "logicalOperator" &&
      filters[key as keyof FilterState] === true
  ).length;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-t border-b border-gray-200 dark:border-gray-700">
      {/* Job Selector */}
      <div className="flex-shrink-0">
        <Select value={currentJobId} onValueChange={handleJobSelect}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Select a job" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Open Jobs ({groupedJobs.open.length})</SelectLabel>
              {groupedJobs.open.map((job) => (
                <SelectItem key={job._id} value={job._id}>
                  {job.title} ({jobCandidateCounts[job._id] || 0} candidates)
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Draft Jobs ({groupedJobs.draft.length})</SelectLabel>
              {groupedJobs.draft.map((job) => (
                <SelectItem key={job._id} value={job._id}>
                  {job.title} ({jobCandidateCounts[job._id] || 0} candidates)
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>
                Closed Jobs ({groupedJobs.closed.length})
              </SelectLabel>
              {groupedJobs.closed.map((job) => (
                <SelectItem key={job._id} value={job._id}>
                  {job.title} ({jobCandidateCounts[job._id] || 0} candidates)
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Search Input */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search candidates..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="pl-10 bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Logical Operator Toggle */}
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>Logical Operator:</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant={
                    filters.logicalOperator === "AND" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, logicalOperator: "AND" }))
                  }
                  className="h-6 px-2 text-xs"
                >
                  AND
                </Button>
                <Button
                  variant={
                    filters.logicalOperator === "OR" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, logicalOperator: "OR" }))
                  }
                  className="h-6 px-2 text-xs"
                >
                  OR
                </Button>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={filters.topCandidates}
            onCheckedChange={() => handleFilterToggle("topCandidates")}
          >
            <Star className="h-4 w-4 mr-2" />
            Top Candidates (7+ score)
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={filters.appliedThisWeek}
            onCheckedChange={() => handleFilterToggle("appliedThisWeek")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Applied This Week
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={filters.appliedToday}
            onCheckedChange={() => handleFilterToggle("appliedToday")}
          >
            <Clock className="h-4 w-4 mr-2" />
            Applied Today
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={filters.appliedIn15Days}
            onCheckedChange={() => handleFilterToggle("appliedIn15Days")}
          >
            <Target className="h-4 w-4 mr-2" />
            Applied in 15 Days
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={filters.toFollowUp}
            onCheckedChange={() => handleFilterToggle("toFollowUp")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            To Follow Up
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={filters.assigned}
            onCheckedChange={() => handleFilterToggle("assigned")}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Assigned
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={filters.notAssigned}
            onCheckedChange={() => handleFilterToggle("notAssigned")}
          >
            <UserX className="h-4 w-4 mr-2" />
            Not Assigned
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={filters.withRemarks}
            onCheckedChange={() => handleFilterToggle("withRemarks")}
          >
            <FileText className="h-4 w-4 mr-2" />
            With Remarks
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={filters.withoutRemarks}
            onCheckedChange={() => handleFilterToggle("withoutRemarks")}
          >
            <FileX className="h-4 w-4 mr-2" />
            Without Remarks
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={showArchived}
            onCheckedChange={(checked) => {
              onShowArchivedChange(checked);
              clearAllFilters();
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Show Archived
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={clearAllFilters}
          >
            Clear All Filters
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {filteredCandidates.length} of {candidates.length} candidates
      </div>
    </div>
  );
}
