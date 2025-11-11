"use client";

import type React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Info,
  Edit,
  UserPlus,
  Briefcase,
  Archive,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { CompactCircularScores } from "@/app/dashboard/jobs/[id]/components/Utils/circular-score";
import { memo, useCallback } from "react";
import type { Candidate } from "@/types/candidate";

interface TableBodyRowsProps {
  candidates: Candidate[];
  visibleColumns: Record<string, boolean>;
  selectedCandidates: string[];
  onSelectCandidate: (candidateId: string) => void;
  onViewDetails: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onAssignInterviewer: (candidate: Candidate) => void;
  onAssignJob: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  onAddRemark: (candidate: Candidate) => void;
  onJobClick: (job: any) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getJobAssignmentInfo(candidate: Candidate) {
  if (
    candidate.jobId &&
    typeof candidate.jobId === "object" &&
    candidate.jobId.title
  ) {
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
}

export const TableBodyRows = memo(function TableBodyRows({
  candidates,
  visibleColumns,
  selectedCandidates,
  onSelectCandidate,
  onViewDetails,
  onEdit,
  onAssignInterviewer,
  onAssignJob,
  onDelete,
  onAddRemark,
  onJobClick,
}: TableBodyRowsProps) {
  const handleViewDetails = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      onViewDetails(candidate);
    },
    [onViewDetails]
  );

  const handleEdit = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(candidate);
    },
    [onEdit]
  );

  const handleAssignInterviewer = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      onAssignInterviewer(candidate);
    },
    [onAssignInterviewer]
  );

  const handleAssignJob = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      onAssignJob(candidate);
    },
    [onAssignJob]
  );

  const handleDelete = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(candidate);
    },
    [onDelete]
  );

  const handleAddRemark = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      onAddRemark(candidate);
    },
    [onAddRemark]
  );

  const handleJobClick = useCallback(
    (job: any, e: React.MouseEvent) => {
      e.stopPropagation();
      onJobClick(job);
    },
    [onJobClick]
  );

  return (
    <>
      {candidates.map((candidate) => {
        const jobInfo = getJobAssignmentInfo(candidate);
        const isSelected = selectedCandidates.includes(candidate._id);

        return (
          <TableRow
            key={candidate._id}
            className="hover:bg-muted/50 cursor-pointer"
          >
            {visibleColumns.select && (
              <TableCell>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelectCandidate(candidate._id)}
                  aria-label={`Select ${candidate.name}`}
                />
              </TableCell>
            )}
            {visibleColumns.name && (
              <TableCell className="font-medium">
                <span
                  className="font-bold text-primary cursor-pointer hover:text-primary/80 hover:underline transition-colors"
                  onClick={(e) => handleViewDetails(candidate, e)}
                >
                  {candidate.name}
                </span>
              </TableCell>
            )}
            {visibleColumns.skills && (
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 5).map((skill: string) => (
                    <Badge key={skill} variant="outline" className="text-xs">
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
                      onClick={(e) => handleJobClick(candidate.jobId, e)}
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
                <CompactCircularScores scores={candidate.scores || {}} />
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
            {visibleColumns.archived && (
              <TableCell>
                {candidate.isDeleted && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  >
                    archived
                  </Badge>
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
                      onClick={(e) => handleViewDetails(candidate, e as any)}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => handleEdit(candidate, e as any)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {candidate.jobId &&
                      typeof candidate.jobId === "object" &&
                      candidate.jobId.title && (
                        <DropdownMenuItem
                          onClick={(e) =>
                            handleAssignInterviewer(candidate, e as any)
                          }
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign Interviewer
                        </DropdownMenuItem>
                      )}
                    <DropdownMenuItem
                      onClick={(e) => handleAssignJob(candidate, e as any)}
                    >
                      <Briefcase className="mr-2 h-4 w-4" />
                      Assign Job
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(candidate, e as any)}
                      disabled={candidate.isDeleted}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {candidate.isDeleted ? "Unarchived" : "Archive"}
                    </DropdownMenuItem>
                    {candidate.jobId &&
                      typeof candidate.jobId === "object" &&
                      candidate.jobId.title && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) =>
                              handleAddRemark(candidate, e as any)
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Remark
                          </DropdownMenuItem>
                        </>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            )}
          </TableRow>
        );
      })}
    </>
  );
});

TableBodyRows.displayName = "TableBodyRows";
