import { Job } from "@/types/job";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { User } from "@/lib/features/org/orgApi";

interface JobActionsCellProps {
  job: Job;
  user: User;
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
  user,
  onSetSelectedJob,
  onEdit,
  onDuplicate,
  onAnalytics,
  onDelete,
  onDetails,
  onEmailSettings,
}: JobActionsCellProps) {
  const router = useRouter();

  return (
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
              className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
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
              className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
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
            className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user?.role === "admin" && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAnalytics(job);
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
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
            <Info className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          {onEmailSettings && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEmailSettings(job);
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
                onDelete(job._id);
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
                onDelete(job._id);
                onSetSelectedJob(job);
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
  );
}
