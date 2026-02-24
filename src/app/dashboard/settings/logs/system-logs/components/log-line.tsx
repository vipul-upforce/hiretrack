import React, { useMemo } from 'react';

interface LogLineProps {
  line: string;
  lineNumber: number;
  searchQuery: string;
  showLineNumber: boolean;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const LogLine = React.memo(
  ({ line, lineNumber, searchQuery, showLineNumber }: LogLineProps) => {
    const content = useMemo(() => {
      if (!searchQuery) return <span>{line}</span>;

      const escapedQuery = escapeRegExp(searchQuery);

      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(`(${escapedQuery})`, 'gi');

      const parts = line.split(regex);

      return (
        <span className="break-all">
          {parts.map((part, i) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
              <mark
                // eslint-disable-next-line react/no-array-index-key
                key={part + i}
                className="rounded-sm bg-yellow-200 px-0.5 text-black dark:bg-yellow-900 dark:text-white"
              >
                {part}
              </mark>
            ) : (
              part
            ),
          )}
        </span>
      );
    }, [line, searchQuery]);

    return (
      <div className="flex border-b border-border/50 py-0.5">
        {showLineNumber && (
          <span className="mr-3 w-8 shrink-0 select-none text-right text-xs text-muted-foreground opacity-50">
            {lineNumber}
          </span>
        )}
        {content}
      </div>
    );
  },
);

LogLine.displayName = 'LogLine';
