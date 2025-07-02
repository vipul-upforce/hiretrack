"use client";

import type { Candidate } from "@/types/candidate";
import { useState } from "react";

const TagsList = ({ candidate }: { candidate: Candidate }) => {
  const [hoveredTag, setHoveredTag] = useState<number | null>(null);
  if (!candidate.tags || candidate.tags.length == 0) return;
  return (
    <div className="w-full flex flex-row items-center justify-start gap-1 mb-2 relative">
      {candidate.tags?.map((tag, i) => {
        return (
          <div
            key={i}
            className="rounded-full flex-1 h-2 min-w-2 max-w-[80px] cursor-pointer transition-all duration-200 hover:h-3 hover:shadow-md relative"
            style={{
              backgroundColor: tag.color,
            }}
            onMouseEnter={() => setHoveredTag(i)}
            onMouseLeave={() => setHoveredTag(null)}
          >
            {hoveredTag === i && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10 shadow-lg">
                {tag.title || tag.title || `Tag ${i + 1}`}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TagsList;
