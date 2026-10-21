import { Job } from '@/types/job';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/redux/hooks';

interface JobActionsCellProps {
  job: Job;
  onSetSelectedJob: (job: Job) => void;
  onEdit: () => void;
  onDuplicate: (job: Job) => void;
  onAnalytics: (job: Job) => void;
  onDelete: (id: string) => void;
  onDetails: () => void;
  onEmailSettings?: (job: Job) => void;
}

export function JobActionsCell({
  job,
  onSetSelectedJob,
  onEdit,
  onDuplicate,
  onAnalytics,
  onDelete,
  onDetails,
  onEmailSettings,
}: JobActionsCellProps) {
  const router = useRouter();

  const { user } = useAppSelector((state) => state.auth || {});

  return (
    <div className="flex items-center justify-end gap-1">
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>
            <p>Open Board</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onSetSelectedJob(job);
                onEdit();
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(job);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Duplicate</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user?.role === 'admin' && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAnalytics(job);
              }}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSetSelectedJob(job);
              onDetails();
            }}
          >
            <Info className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {onEmailSettings && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEmailSettings(job);
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email Settings
            </DropdownMenuItem>
          )}
          {!job.isDeleted ? (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(job._id);
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
                onDelete(job._id);
                onSetSelectedJob(job);
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
  );
}
