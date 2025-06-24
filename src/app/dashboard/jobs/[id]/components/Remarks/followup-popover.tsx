import { CalendarClockIcon, XIcon } from "lucide-react";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

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
  const contentWithDate = (
    <div className="border cursor-default border-blue-200/60 rounded-lg w-fit px-4 py-1 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/60 hover:from-blue-100/80 hover:to-indigo-100/60 transition-all duration-200 shadow-sm hover:shadow-md">
      <CalendarClockIcon size={15} className="mr-2 text-blue-600" />
      <p className="text-xs font-medium text-slate-700">
        {formatDate(date || new Date())} at {formatTime(date || new Date())}
      </p>
    </div>
  );
  const contentWODate = (
    <div className="border cursor-default border-blue-200/60 rounded-lg w-fit px-4 py-1 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/60 hover:from-blue-100/80 hover:to-indigo-100/60 transition-all duration-200 shadow-sm hover:shadow-md">
      <CalendarClockIcon size={15} className="mr-2 text-blue-600" />
      <p className="text-xs font-medium text-slate-700">Follow Up</p>
    </div>
  );

  return showToolTip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {date ? contentWithDate : contentWODate}
        </TooltipTrigger>
        <TooltipContent className="bg-white border border-slate-200 text-slate-900 max-w-80 break-words shadow-lg">
          <div className="text-sm font-semibold text-blue-700 mb-1 w-full flex items-center justify-between">
            <p className="mr-2">Followup</p>
            <Button
              onClick={handleRemoveFollowUp}
              className="w-5 h-5 p-1 rounded-full bg-gray-200 text-black hover:bg-gray-300 transition duration-300"
            >
              {/* <X size={1} className="w-1 h-1" /> */}
              <XIcon size={10} strokeWidth={1.25} />
            </Button>
          </div>
          <p className="text-md text-slate-600 leading-relaxed">{note}</p>
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
