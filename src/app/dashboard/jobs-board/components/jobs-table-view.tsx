"use client";

import { Job } from "@/types/job";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Layout,
  Edit,
  Info,
  Mail,
  Copy,
  Trash2,
  ArchiveRestore,
  BarChart3,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User as UserIcon,
  Briefcase,
  Calendar,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";
import ConfirmationDialog from "../../jobs/[id]/components/Dialogs/ConfirmationDialog";
import { JobAnalyticsModal } from "./JobAnalyticsModal";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobsTableViewProps {
  jobs: Job[];
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  setIsEditMode: (editMode: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
  setDuplicate: (x: boolean) => void;
  onEmailSettingsClick?: (job: Job) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

export function JobsTableView({
  jobs,
  setSelectedJob,
  setIsDetailsOpen,
  setIsEditMode,
  handleDeleteClick,
  setDuplicate,
  onEmailSettingsClick,
  sortField,
  sortDirection,
  onSort,
}: JobsTableViewProps) {
  const router = useRouter();
  const { formNameObject } = useCustomForm("Job Position");
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [selectedJobForDuplicate, setSelectedJobForDuplicate] = useState<Job | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedJobForAnalytics, setSelectedJobForAnalytics] = useState<Job | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );

  const handleDuplicateClick = (job: Job) => {
    setSelectedJobForDuplicate(job);
    setIsDuplicateDialogOpen(true);
  };

  const handleAnalyticsClick = (job: Job) => {
    setSelectedJobForAnalytics(job);
    setIsAnalyticsOpen(true);
  };

  // Get custom fields that should be shown on cards for table columns
  const customFieldColumns = formNameObject?.fields
    .filter((field) => field.showOnCard && !field.jobId)
    .slice(0, 2) || []; // Limit to 2 custom fields to avoid table being too wide

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <>
      <CustomScrollbar className="h-full">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-black/30 hover:bg-gray-50 dark:hover:bg-black/30 border-b border-gray-200 dark:border-gray-700">
                <TableHead
                  className="cursor-pointer font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12"
                  onClick={() => onSort("title")}
                >
                  <div className="flex items-center gap-1">
                    <span>Job Title</span>
                    {getSortIcon("title")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12"
                  onClick={() => onSort("status")}
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {getSortIcon("status")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12"
                  onClick={() => onSort("candidateCount")}
                >
                  <div className="flex items-center gap-1">
                    <span>Applications</span>
                    {getSortIcon("candidateCount")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12"
                  onClick={() => onSort("experience")}
                >
                  <div className="flex items-center gap-1">
                    <span>Experience</span>
                    {getSortIcon("experience")}
                  </div>
                </TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12">
                  <span>Skills</span>
                </TableHead>
                {customFieldColumns.map((field) => (
                  <TableHead key={field.label} className="font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12">
                    {field.label.split(" |||||(")[0]}
                  </TableHead>
                ))}
                <TableHead
                  className="cursor-pointer font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12"
                  onClick={() => onSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    <span>Created</span>
                    {getSortIcon("createdAt")}
                  </div>
                </TableHead>
                <TableHead className="text-right font-medium text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 h-12">
                  <span>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8 + customFieldColumns.length} className="text-center h-32">
                    <p className="text-gray-500 dark:text-gray-400">No jobs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job._id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/jobs/${job._id}`)}
                  >
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {!job.isPublished && job.status === "open" && (
                            <TooltipProvider>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Candidates cannot apply until this job is published.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">{job.title}</span>
                        </div>
                        {job.experience !== undefined && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {job.experience} {job.experience === 1 ? 'year' : 'years'} exp required
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant={
                          job.status === "open"
                            ? "default"
                            : job.status === "closed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{job.candidateCount || 0}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        {job.experience || job.experience === 0
                          ? `${job.experience} years`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {job.skills && job.skills.length > 0 ? (
                          <>
                            {job.skills.slice(0, 2).map((skill, index) => (
                              <Badge
                                key={`${job._id}-skill-${index}`}
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {job.skills.length > 2 && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                +{job.skills.length - 2}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    {customFieldColumns.map((field) => {
                      const value = job.customFields?.[field.label];
                      return (
                        <TableCell key={field.label} className="py-4">
                          {value && typeof value === "string" ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{value}</span>
                          ) : Array.isArray(value) && value.length > 0 ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400">{value.length} files</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {job.tracking?.createdAt
                          ? formatDistanceToNow(new Date(job.tracking.createdAt), {
                              addSuffix: false,
                            }).replace('about ', '')
                          : "recently"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/jobs/${job._id}`);
                                }}
                              >
                                <Layout className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Open Board</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJob(job);
                                  setIsEditMode(true);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateClick(job);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Duplicate</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user?.role === "admin" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyticsClick(job);
                                }}
                              >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Analytics
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(job);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Info className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {onEmailSettingsClick && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEmailSettingsClick(job);
                                }}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Email Settings
                              </DropdownMenuItem>
                            )}
                            {!job.isDeleted ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(job._id);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive Job
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(job._id);
                                  setSelectedJob(job);
                                }}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Unarchive Job
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CustomScrollbar>

      {selectedJobForDuplicate && (
        <ConfirmationDialog
          title="Create Duplicate Job"
          message="Are you sure you want to create a duplicate of this job?"
          isOpen={isDuplicateDialogOpen}
          setIsOpen={setIsDuplicateDialogOpen}
          onConfirm={() => {
            setSelectedJob(selectedJobForDuplicate);
            setDuplicate(true);
            setSelectedJobForDuplicate(null);
          }}
          onCancel={() => {
            setIsDuplicateDialogOpen(false);
            setSelectedJobForDuplicate(null);
          }}
          className="sm:max-w-[300px]"
        />
      )}

      {selectedJobForAnalytics && user?.organizationId && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => {
            setIsAnalyticsOpen(false);
            setSelectedJobForAnalytics(null);
          }}
          job={selectedJobForAnalytics}
          organizationId={user.organizationId}
        />
      )}
    </>
  );
}
