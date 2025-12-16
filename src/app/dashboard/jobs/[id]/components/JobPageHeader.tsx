import { Button } from '@/components/ui/button';
import {
  Settings2,
  BarChart3,
  MoreHorizontal,
  Mail,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { User } from '@/lib/features/users/usersApi';
import { Job } from '@/types/job';
import { Breadcrumb } from './Utils/breadcrumb';
import { CreateLaneDialog } from './Dialogs/create-lane-dialog';
import { CreateCandidateDialog } from './Dialogs/create-candidate-dialog';

interface JobPageHeaderProps {
  jobTitle?: string;
  user: User | null;
  job: Job | undefined;
  isLoading: boolean;
  onPromptStatusChange: (checked: boolean) => void;
  onOpenCustomFields: () => void;
  onOpenAnalytics: () => void;
  onOpenEmailSettings: () => void;
  onAddLane: (title: string) => void;
  jobId: string;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  droppedFileData: File | null;
}

export function JobPageHeader({
  jobTitle,
  user,
  job,
  isLoading,
  onPromptStatusChange,
  onOpenCustomFields,
  onOpenAnalytics,
  onOpenEmailSettings,
  onAddLane,
  jobId,
  isDialogOpen,
  setIsDialogOpen,
  droppedFileData,
}: JobPageHeaderProps) {
  return (
    <div className="flex-shrink-0 px-4 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <Breadcrumb
          jobTitle={jobTitle}
          links={[{ title: 'Jobs', href: '/dashboard/jobs-board' }]}
        />

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[270px] mt-2" align="end">
              <div className="space-y-2 pt-4 pb-2 px-1">
                {user?.role === 'admin' && job && (
                  <div className="flex items-center mx-4 gap-2 mb-2 mt-1">
                    <Checkbox
                      id="promptForStatusChangeReason"
                      checked={job.promptForStatusChangeReason || false}
                      disabled={isLoading}
                      onCheckedChange={(checked: boolean) => {
                        onPromptStatusChange(checked);
                      }}
                    />
                    <label
                      htmlFor="promptForStatusChangeReason"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Prompt for status change reason
                    </label>
                  </div>
                )}
                <Button
                  variant="ghost"
                  onClick={onOpenCustomFields}
                  className="w-full justify-start gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Personalized form fields
                </Button>
                {user?.role === 'admin' && (
                  <Button
                    variant="ghost"
                    onClick={onOpenAnalytics}
                    className="w-full justify-start gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={onOpenEmailSettings}
                  className="w-full justify-start gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Settings
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <CreateLaneDialog onAddLane={onAddLane} />
          <CreateCandidateDialog
            jobId={jobId}
            isOpen={isDialogOpen}
            setIsOpen={setIsDialogOpen}
            resumeFile={droppedFileData}
          />
        </div>
      </div>
    </div>
  );
}

