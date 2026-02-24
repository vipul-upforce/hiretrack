import { Button } from '@/components/ui/button';
import { Settings2, BarChart3, MoreHorizontal, Mail } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Breadcrumb } from './Utils/breadcrumb';
import { CreateLaneDialog } from './Dialogs/create-lane-dialog';
import { CreateCandidateDialog } from './Dialogs/create-candidate-dialog';

interface JobPageHeaderProps {
  jobTitle?: string;
  userRole?: string;
  promptForStatusChangeReason?: boolean;
  isUpdatingJob: boolean;
  onPromptChange: (checked: boolean) => void;
  onCustomFieldsOpen: () => void;
  onAnalyticsOpen: () => void;
  onEmailSettingsOpen: () => void;
  onAddLane: (title: string) => void;
  jobId: string;
  isDialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  droppedFileData: File | null;
}

export function JobPageHeader({
  jobTitle,
  userRole,
  promptForStatusChangeReason,
  isUpdatingJob,
  onPromptChange,
  onCustomFieldsOpen,
  onAnalyticsOpen,
  onEmailSettingsOpen,
  onAddLane,
  jobId,
  isDialogOpen,
  onDialogOpenChange,
  droppedFileData,
}: JobPageHeaderProps) {
  return (
    <div className="flex-shrink-0 px-4 pb-2 pt-4">
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
            <PopoverContent className="mt-2 w-[270px]" align="end">
              <div className="space-y-2 px-1 pb-2 pt-4">
                {userRole === 'admin' && (
                  <div className="mx-4 mb-2 mt-1 flex items-center gap-2">
                    <Checkbox
                      id="promptForStatusChangeReason"
                      checked={promptForStatusChangeReason || false}
                      disabled={isUpdatingJob}
                      onCheckedChange={onPromptChange}
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
                  onClick={onCustomFieldsOpen}
                  className="w-full justify-start gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Personalized form fields
                </Button>
                {userRole === 'admin' && (
                  <Button
                    variant="ghost"
                    onClick={onAnalyticsOpen}
                    className="w-full justify-start gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={onEmailSettingsOpen}
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
            setIsOpen={onDialogOpenChange}
            resumeFile={droppedFileData}
          />
        </div>
      </div>
    </div>
  );
}

