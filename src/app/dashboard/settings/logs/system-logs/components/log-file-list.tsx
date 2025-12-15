import { HardDrive, Loader2 } from 'lucide-react';
import React from 'react';

interface LogFileListProps {
  files: string[];
  selectedFile: string | null;
  onSelect: (file: string) => void;
  isLoading: boolean;
  isAvailable: boolean;
  totalStorage: string | null | undefined;
}

interface FileItemProps {
  fileName: string;
  isSelected: boolean;
  onClick: () => void;
}

function FileItem({ fileName, isSelected, onClick }: FileItemProps) {
  // Helper for conditional class names
  const baseClasses = 'cursor-pointer rounded p-2 text-sm transition-colors';
  const stateClasses = isSelected
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    : 'hover:bg-gray-100 dark:hover:bg-gray-800';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left ${baseClasses} ${stateClasses}`}
      >
        {fileName}
      </button>
    </li>
  );
}

export function LogFileList({
  files,
  selectedFile,
  onSelect,
  isLoading,
  isAvailable,
  totalStorage,
}: LogFileListProps) {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading files...</span>
        </div>
      );
    }

    if (!isAvailable || files.length === 0) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No Nginx log files available.
        </div>
      );
    }

    return (
      <ul className="space-y-1">
        {files.map((file) => (
          <FileItem
            key={file}
            fileName={file}
            isSelected={selectedFile === file}
            onClick={() => onSelect(file)}
          />
        ))}
      </ul>
    );
  };

  return (
    <div className="col-span-1 flex min-h-0 flex-col">
      {/* Header Section */}
      <div className="mb-2 flex flex-shrink-0 items-center justify-between">
        <h3 className="text-sm font-bold">Log Files ({files.length})</h3>

        {totalStorage && (
          <div className="flex items-center gap-1 rounded-md bg-gray-200 px-2 py-[3px] text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <HardDrive className="h-3 w-3 opacity-80" />
            <span className="opacity-80">Total Size:</span>
            <strong className="font-semibold">{totalStorage}</strong>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="min-h-0 flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
}
