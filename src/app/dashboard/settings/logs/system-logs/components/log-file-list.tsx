interface LogFileListProps {
  files: string[];
  selectedFile: string | null;
  onSelect: (file: string) => void;
  isLoading: boolean;
  isAvailable: boolean;
}

export function LogFileList({
  files,
  selectedFile,
  onSelect,
  isLoading,
  isAvailable,
}: LogFileListProps) {
  return (
    <div className="col-span-1 flex flex-col min-h-0">
      <h3 className="font-bold text-sm mb-2 flex-shrink-0">
        Log Files ({files.length})
      </h3>
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="text-gray-500 text-sm">Loading files...</div>
        ) : isAvailable ? (
          <ul className="space-y-1">
            {files.map((file) => (
              <li
                key={file}
                className={`cursor-pointer p-2 text-sm rounded ${
                  selectedFile === file
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => onSelect(file)}
              >
                {file}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No Nginx log files available.
          </div>
        )}
      </div>
    </div>
  );
}
