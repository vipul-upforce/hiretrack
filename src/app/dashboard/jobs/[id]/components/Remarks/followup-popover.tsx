import { CalendarClockIcon, XIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React, { useState } from 'react';
import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';
import ConfirmationDialog from '../Dialogs/ConfirmationDialog';

function FollowupDisplay({
  note,
  date,
  showToolTip = true,
  handleRemoveFollowUp,
}: {
  note: string;
  date: Date | null;
  showToolTip?: boolean;
  handleRemoveFollowUp?: () => void;
}) {
  const [removeFUOpen, setRemoveFUOpen] = useState(false);
  const contentWithDate = (
    <div className="flex w-fit cursor-default flex-row items-center justify-between rounded border bg-blue-50 px-2 py-1 transition-colors duration-200 hover:bg-blue-100 dark:border-accent dark:bg-black dark:hover:bg-gray-900">
      <CalendarClockIcon size={14} className="mr-1 text-blue-600" />
      <div className="flex w-full flex-row items-center justify-between">
        <p className="text-xs text-foreground">
          {formatDate(date || new Date())} at
          {formatTime(date || new Date())}
        </p>
      </div>
      {showToolTip && (
        <button
          type="button"
          onClick={() => setRemoveFUOpen(true)}
          className="ml-1 h-4 w-4 rounded bg-transparent text-muted-foreground transition-colors duration-200 hover:text-destructive"
        >
          <XIcon size={10} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
  const contentWODate = (
    <div className="flex w-fit cursor-default flex-row items-center justify-between rounded border border-blue-200 bg-blue-50 px-2 py-1 transition-colors duration-200 hover:bg-blue-100">
      <CalendarClockIcon size={14} className="mr-1 text-blue-600" />
      <div className="flex w-full flex-row items-center justify-between">
        <p className="text-xs text-foreground">Follow Up</p>
      </div>
      {showToolTip && (
        <button
          type="button"
          onClick={() => setRemoveFUOpen(true)}
          className="ml-1 h-4 w-4 rounded bg-transparent text-muted-foreground transition-colors duration-200 hover:text-destructive"
        >
          <XIcon size={10} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );

  if (removeFUOpen) {
    return (
      <ConfirmationDialog
        title="Remove Follow Up"
        message="Are you sure you want to remove this followup?"
        isOpen={removeFUOpen}
        setIsOpen={setRemoveFUOpen}
        onConfirm={handleRemoveFollowUp || (() => {})}
        onCancel={() => setRemoveFUOpen(false)}
        loadingText="Removing..."
        className="sm:max-w-[300px]"
      />
    );
  }
  let displayContent: React.ReactNode;

  if (showToolTip) {
    displayContent = (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {date ? contentWithDate : contentWODate}
          </TooltipTrigger>
          <TooltipContent className="max-w-80 break-words border border-border bg-popover text-popover-foreground shadow-lg">
            <p className="text-md leading-relaxed text-muted-foreground">
              {note}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else if (date) {
    displayContent = contentWithDate;
  } else {
    displayContent = contentWODate;
  }

  return displayContent;
}

export default FollowupDisplay;
