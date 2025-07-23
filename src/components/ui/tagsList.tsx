"use client";

import type { Candidate } from "@/types/candidate";
// import { \ } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TagsList = ({ candidate }: { candidate: Candidate }) => {
  // const [hoveredTag, setHoveredTag] = useState<number | null>(null);

  if (!candidate.tags || candidate.tags.length === 0) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-full flex flex-row items-center justify-start gap-1 mb-2 relative max-w-[90%] flex-wrap z-10">
        {candidate.tags?.map((tag, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className="rounded-full flex-1 h-2 min-w-2 max-w-[80px] cursor-pointer transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: tag.color }}
                // onMouseEnter={() => setHoveredTag(i)}
                // onMouseLeave={() => setHoveredTag(null)}
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg max-w-[500px] break-words"
            >
              <p className="px-2">{tag.title || `Tag ${i + 1}`}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default TagsList;
