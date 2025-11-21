import { memo } from "react";

interface ResultsInfoProps {
  filteredCount: number;
  totalCount: number;
  activeFilters: string[];
}

export const ResultsInfo = memo(function ResultsInfo({
  filteredCount,
  totalCount,
  activeFilters,
}: ResultsInfoProps) {
  return (
    <div className="px-4 py-2 bg-muted/20 border-b">
      <div className="text-sm text-muted-foreground">
        {activeFilters.length > 0 ? (
          <>
            Showing{" "}
            <span className="font-medium text-foreground">{filteredCount}</span>{" "}
            of <span className="font-medium text-foreground">{totalCount}</span>{" "}
            results
            {activeFilters.length > 0 && (
              <span className="ml-2">
                (filtered by:{" "}
                {activeFilters
                  .map((f) =>
                    f
                      .replace("-", " ")
                      .replace(/([A-Z])/g, " $1")
                      .trim()
                  )
                  .join(", ")}
                )
              </span>
            )}
          </>
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-foreground">{filteredCount}</span>{" "}
            of <span className="font-medium text-foreground">{totalCount}</span>{" "}
            results
          </>
        )}
      </div>
    </div>
  );
});

ResultsInfo.displayName = "ResultsInfo";
