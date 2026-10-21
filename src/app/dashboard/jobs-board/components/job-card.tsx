'use client';

import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import {
  formatJobExperience,
  normalizeJobExperience,
} from '@/lib/utils/job-experience';
import { Job } from '@/types/job';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Info,
  Trash2,
  ArchiveRestore,
  Copy,
  Layout,
  MoreHorizontal,
  Edit,
  AlertTriangle,
  BarChart3,
  Mail,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useCustomForm, { FileData } from '@/Custom_Fields/hooks/useCustomForm';
import { formatDistanceToNow } from 'date-fns';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import ConfirmationDialog from '../../jobs/[id]/components/Dialogs/ConfirmationDialog';
import { JobAnalyticsModal } from './JobAnalyticsModal';
import AttachmentsPopover from '../../jobs/[id]/components/Remarks/attachments-popover';

interface JobCardProps {
  job: Job;
  index: number;
  setSelectedJob: (job: Job | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  setIsEditMode: (editMode: boolean) => void;
  handleDeleteClick: (jobId: string) => void;
  setDuplicate: (x: boolean) => void;
  onEmailSettingsClick?: (job: Job) => void;
}

function JobCard({
  job,
  index,
  setSelectedJob,
  setIsDetailsOpen,
  setIsEditMode,
  handleDeleteClick,
  setDuplicate,
  onEmailSettingsClick,
}: JobCardProps) {
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');
  const { formNameObject } = useCustomForm('Job Position');
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth || {});

  // Get user's organization ID
  useEffect(() => {
    const getUserOrganization = async () => {
      try {
        if (user) {
          setOrganizationId(user.organizationId as string);
        }
      } catch (error) {
        logger.error('Error getting user organization:', error);
      }
    };

    getUserOrganization();
  }, []);

  return (
    <>
      <Draggable key={job._id} draggableId={job._id} index={index}>
        {(provided: DraggableProvided) => (
          <div
            role="button"
            tabIndex={0}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="relative w-full min-w-0 max-w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-lg dark:border-gray-700 dark:bg-black"
            onClick={(e) => {
              // Only trigger on actual click, not on drag
              if (e.detail === 0) return; // Ignore programmatic clicks

              // Check if click target is a button or inside a dropdown
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('[role="menuitem"]') ||
                target.closest('[data-radix-collection-item]')
              ) {
                return; // Don't navigate if clicking on buttons or menu items
              }

              // Navigate to job kanban
              router.push(`/dashboard/jobs/${job._id}`);
            }}
          >
            {/* Header Section - Job Title and Actions */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="truncate pr-3 text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                {job.title}
              </h3>
              <div className="flex items-center gap-1">
                {/* Warning Icon for Unpublished Jobs in Open Lane */}
                {!job.isPublished && job.status === 'open' && (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex h-8 w-8 cursor-pointer items-center justify-center text-amber-500 hover:text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="border border-border bg-popover text-popover-foreground">
                        <p>
                          Candidates cannot apply until this job is published.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Analytics Icon */}
                {user?.role === 'admin' && (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAnalyticsOpen(true);
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="border border-border bg-popover text-popover-foreground">
                        <p>View Analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Layout Icon for Opening Job Board */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/jobs/${job._id}`);
                  }}
                >
                  <Layout className="h-4 w-4" />
                </Button>

                {/* Three Dots Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-auto min-w-[120px] max-w-[200px]"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/jobs/${job._id}`);
                      }}
                    >
                      <Layout className="mr-2 h-4 w-4" />
                      Open Board
                    </DropdownMenuItem>
                    {user?.role !== 'hr' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAnalyticsOpen(true);
                        }}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setIsEditMode(true);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Job
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {onEmailSettingsClick && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmailSettingsClick(job);
                        }}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDuplicateDialogOpen(true);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate Job
                    </DropdownMenuItem>
                    {!job.isDeleted ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(job._id);
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
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
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Unarchive Job
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Job Details */}
            <div className="mb-5 space-y-4">
              {/* Candidates Count */}
              <div className="flex items-center gap-2.5 text-sm">
                <div className="flex h-4 w-4 items-center justify-center">
                  <div className="dark:bg-white0 h-2 w-2 rounded-full bg-gray-400" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
                    Candidates
                  </span>
                  <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                    {job.candidateCount} applicants
                  </span>
                </div>
              </div>

              {/* Experience */}
              {normalizeJobExperience(job.experience) && (
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="flex h-4 w-4 items-center justify-center">
                    <div className="dark:bg-white0 h-2 w-2 rounded-full bg-gray-400" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
                      Experience Required
                    </span>
                    <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                      {formatJobExperience(job.experience)}
                    </span>
                  </div>
                </div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-4 w-4 items-center justify-center">
                      <div className="dark:bg-white0 h-2 w-2 rounded-full bg-gray-400" />
                    </div>
                    <span className="truncate text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">
                      Skills Required
                    </span>
                  </div>
                  <div className="ml-6 flex flex-wrap gap-2">
                    {job.skills.slice(0, 4).map((skill) => (
                      <Badge
                        key={`${job._id}-skill-${skill}`}
                        variant="secondary"
                        className="max-w-full truncate border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-black dark:text-gray-300"
                        title={skill}
                      >
                        {skill}
                      </Badge>
                    ))}
                    {job.skills.length > 4 && (
                      <Badge
                        variant="secondary"
                        className="flex-shrink-0 border border-gray-300 bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200"
                      >
                        +{job.skills.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Fields */}
            {job.customFields &&
              Object.entries(job.customFields).filter(([key, value]) => {
                const field = formNameObject?.fields.find(
                  (f) => f.label === key,
                );
                if (field?.jobId && field.jobId !== job._id) {
                  return false;
                }
                return (
                  field?.showOnCard &&
                  value != null &&
                  value !== '' &&
                  (!Array.isArray(value) || value.length > 0)
                );
                // return field?.showOnCard;
              }).length > 0 && (
                <div className="mb-5 space-y-3">
                  {Object.entries(job.customFields)
                    .filter(([key, value]) => {
                      const field = formNameObject?.fields.find(
                        (f) => f.label === key,
                      );
                      if (field?.jobId && field.jobId !== job._id) {
                        return false;
                      }
                      // return field?.showOnCard;
                      return (
                        field?.showOnCard &&
                        value != null &&
                        value !== '' &&
                        (!Array.isArray(value) || value.length > 0)
                      );
                    })
                    .map(([key, value]) => (
                      <div key={`${key}`} className="text-sm">
                        <span className="mr-1 text-gray-600 dark:text-gray-400 ">
                          {key.split(' |||||(')[0]}
                        </span>
                        {(() => {
                          if (typeof value === 'string') {
                            return (
                              <span className="font-semibold capitalize text-orange-700 dark:text-orange-400">
                                {value}
                              </span>
                            );
                          }
                          if (Array.isArray(value) && value.length > 0) {
                            return (
                              <AttachmentsPopover
                                attachments={value.map((file, idx) => {
                                  if (typeof file === 'string') {
                                    return {
                                      id: '',
                                      name: '',
                                      url: '',
                                      type: '',
                                      size: 0,
                                    };
                                  }
                                  return {
                                    id: `${key}-${idx}-${file.name}`,
                                    name: file.name,
                                    url: (file as FileData).base64 || '#',
                                    type: file.type || 'unknown',
                                    size: file.size || 0,
                                  };
                                })}
                                onMoreClick={() => null}
                              />
                            );
                          }
                          return 'default';
                        })()}
                      </div>
                    ))}
                </div>
              )}

            {/* Footer - Created Date */}
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="flex items-center justify-end">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Created{' '}
                  {job.tracking?.createdAt
                    ? formatDistanceToNow(new Date(job.tracking.createdAt), {
                        addSuffix: true,
                      })
                    : 'recently'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Draggable>

      {isDuplicateDialogOpen && (
        <ConfirmationDialog
          title="Create Duplicate Job"
          message="Are you sure you want to create a duplicate of this job?"
          isOpen={isDuplicateDialogOpen}
          setIsOpen={setIsDuplicateDialogOpen}
          onConfirm={() => {
            setSelectedJob(job);
            setDuplicate(true);
          }}
          onCancel={() => setIsDuplicateDialogOpen(false)}
          className="sm:max-w-[300px]"
        />
      )}

      {isAnalyticsOpen && organizationId && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          job={job}
          organizationId={organizationId}
        />
      )}
    </>
  );
}

export default JobCard;
