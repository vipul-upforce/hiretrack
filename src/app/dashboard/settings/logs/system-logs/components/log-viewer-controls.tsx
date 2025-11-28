interface LogViewerControlsProps {
  selectedFile: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  showLineNumbers: boolean;
  onToggleLineNumbers: (val: boolean) => void;
  isLoading: boolean;
  hasContent: boolean;
}

export function LogViewerControls({
  selectedFile,
  searchTerm,
  onSearchChange,
  showLineNumbers,
  onToggleLineNumbers,
  isLoading,
  hasContent,
}: LogViewerControlsProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-shrink-0">
      <div className="flex flex-row items-center w-[70%]">
        <h3 className="font-bold text-sm mr-4">{selectedFile}</h3>
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
          aria-label="Search nginx logs"
        />
        {isLoading && !hasContent && (
          <div className="px-4">
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-row items-center gap-3">
        <input
          id="showln"
          type="checkbox"
          checked={showLineNumbers}
          onChange={(e) => onToggleLineNumbers(e.target.checked)}
        />
        <label htmlFor="showln" className="text-sm">
          Show Line Numbers
        </label>
      </div>
    </div>
  );
}
