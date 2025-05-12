import { Candidate } from "@/types/candidate";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { NotebookText, Star } from "lucide-react";
import { formatTime } from "../hooks/dateTimeFormatting";

const RemarksPopover = ({
  candidate,
  onMoreClick,
}: {
  candidate: Candidate;
  onMoreClick: () => void;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          onClick={(e) => {
            e.stopPropagation();
          }}
          variant="secondary"
          className="mr-1 flex flex-row items-center justify-evenly w-[60px]"
        >
          {candidate?.remarks?.length}
          <NotebookText className="h-4 w-4 ml-1" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          <h4 className="font-bold">Remarks</h4>
          {candidate.remarks && candidate.remarks.length > 0 ? (
            <div className="space-y-2">
              {[...candidate.remarks]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 6)
                .map((remark, index) => (
                  <div key={index} className="border-b pb-2">
                    <div className="text-sm capitalize align-center w-full break-words">
                      {remark.description}
                      {remark?.rating && (
                        <div className="flex">
                          {remark?.rating}/5
                          <Star
                            size={"15px"}
                            className="mt-[1px]"
                            style={{ color: "orange" }}
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(remark.date).toLocaleDateString()}
                      &nbsp; {formatTime(remark.date)}
                    </p>
                  </div>
                ))}
              {candidate.remarks.length > 6 && (
                <p
                  className="text-xs text-muted-foreground text-center cursor-pointer"
                  onClick={() => onMoreClick()}
                >
                  +{candidate.remarks.length - 6} more remarks
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No remarks yet</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RemarksPopover;
