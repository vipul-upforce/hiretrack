'use client';

import type { Candidate } from '@/types/candidate';
// import { \ } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function TagsList({ candidate }: { candidate: Candidate }) {
  // const [hoveredTag, setHoveredTag] = useState<number | null>(null);

  if (!candidate.tags || candidate.tags.length === 0) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative z-10 my-2 flex w-full max-w-[90%] flex-row flex-wrap items-center justify-start gap-1">
        {candidate.tags?.map((tag, i) => (
          <Tooltip key={`${tag.title}-${tag.color}`}>
            <TooltipTrigger asChild>
              <div
                className="h-2 min-w-2 max-w-[80px] flex-1 cursor-pointer rounded-full transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: tag.color }}
                // onMouseEnter={() => setHoveredTag(i)}
                // onMouseLeave={() => setHoveredTag(null)}
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="max-w-[500px] break-words rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg"
            >
              <p className="px-2">{tag.title || `Tag ${i + 1}`}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export default TagsList;
