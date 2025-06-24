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
    <div className="border cursor-default border-blue-200/60 rounded-lg w-fit px-2 py-1 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/60 hover:from-blue-100/80 hover:to-indigo-100/60 transition-all duration-200 shadow-sm hover:shadow-md">
      <CalendarClockIcon size={18} className="mr-2 text-blue-600" />
      <div className=" flex flex-row items-center justify-between w-full">
        <p
          className="text-slate-700"
          style={{
            fontSize: "11px",
          }}
        >
          {formatDate(date || new Date())} at {formatTime(date || new Date())}
        </p>
      </div>
      <button
        onClick={() => setRemoveFUOpen(true)}
        className="w-4 h-4 ml-1 bg-transparent rounded-full text-black hover:bg-gray-200 transition duration-300 "
      >
        {/* <X size={1} className="w-1 h-1" /> */}
        <XIcon size={14} strokeWidth={1.25} />
      </button>
    </div>
  );
  const contentWODate = (
    <div className="border cursor-default border-blue-200/60 rounded-lg w-fit px-2 py-1 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/60 hover:from-blue-100/80 hover:to-indigo-100/60 transition-all duration-200 shadow-sm hover:shadow-md">
      <CalendarClockIcon size={18} className="mr-2 text-blue-600" />
      <div className=" flex flex-row items-center justify-between w-full">
        <p
          className=" text-slate-700"
          style={{
            fontSize: "11px",
          }}
        >
          Follow Up
        </p>
      </div>
      <button
        onClick={() => setRemoveFUOpen(true)}
        className="w-4 h-4 ml-1 bg-transparent rounded-full text-black hover:bg-gray-200 transition duration-300 "
      >
        {/* <X size={1} className="w-1 h-1" /> */}
        <XIcon size={14} strokeWidth={1.25} />
      </button>
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
  return showToolTip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {date ? contentWithDate : contentWODate}
        </TooltipTrigger>
        <TooltipContent className="bg-white border border-slate-200 text-slate-900 max-w-80 break-words shadow-lg">
          <div className="text-sm font-semibold text-blue-700 mb-1 w-full flex items-center justify-between">
            <p className="mr-2">Followup</p>
            {/* <Button
              onClick={handleRemoveFollowUp}
              className="w-5 h-5 p-1 rounded-full bg-gray-200 text-black hover:bg-gray-300 transition duration-300"
            >
              <XIcon size={10} strokeWidth={1.25} />
            </Button> */}
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
