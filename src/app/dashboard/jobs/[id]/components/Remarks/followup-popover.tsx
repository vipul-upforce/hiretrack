import { CalendarClockIcon, XIcon } from "lucide-react";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmationDialog from "../Dialogs/ConfirmationDialog";
import { useState } from "react";

const FollowupDisplay = ({
  note,
  date,
  showToolTip = true,
  handleRemoveFollowUp,
}: {
  note: string;
  date: Date | null;
  showToolTip?: boolean;
  handleRemoveFollowUp?: () => void;
}) => {
  const [removeFUOpen, setRemoveFUOpen] = useState(false);
  const contentWithDate = (
    <div className="border cursor-default dark:border-accent rounded w-fit px-2 py-1 flex flex-row items-center justify-between dark:bg-gray-800 bg-blue-50 hover:bg-blue-100 dark:hover:bg-gray-900 transition-colors duration-200">
      <CalendarClockIcon size={14} className="mr-1 text-blue-600" />
      <div className="flex flex-row items-center justify-between w-full">
        <p className="text-foreground text-xs">
          {formatDate(date || new Date())} at {formatTime(date || new Date())}
        </p>
      </div>
      {showToolTip && (
        <button
          onClick={() => setRemoveFUOpen(true)}
          className="w-4 h-4 ml-1 bg-transparent rounded text-muted-foreground hover:text-destructive transition-colors duration-200"
        >
          <XIcon size={10} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
  const contentWODate = (
    <div className="border cursor-default border-blue-200 rounded w-fit px-2 py-1 flex flex-row items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors duration-200">
      <CalendarClockIcon size={14} className="mr-1 text-blue-600" />
      <div className="flex flex-row items-center justify-between w-full">
        <p className="text-foreground text-xs">Follow Up</p>
      </div>
      {showToolTip && (
        <button
          onClick={() => setRemoveFUOpen(true)}
          className="w-4 h-4 ml-1 bg-transparent rounded text-muted-foreground hover:text-destructive transition-colors duration-200"
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
        onConfirm={handleRemoveFollowUp || (() => { })}
        onCancel={() => setRemoveFUOpen(false)}
        loadingText="Removing..."
        className="sm:max-w-[300px]"
      />
    );
  }
  return showToolTip ? (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {date ? contentWithDate : contentWODate}
        </TooltipTrigger>
        <TooltipContent className="bg-popover border border-border text-popover-foreground max-w-80 break-words shadow-lg">
          <p className="text-md text-muted-foreground leading-relaxed">{note}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : date ? (
    contentWithDate
  ) : (
    contentWODate
  );
};

export default FollowupDisplay;
