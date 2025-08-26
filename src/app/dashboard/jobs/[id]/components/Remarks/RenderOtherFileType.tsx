import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const RenderOtherFileType = ({
  file,
}: {
  file: { id: string; name: string; url: string; type: string; size: number };
}) => {
  const downloadFile = async (url: string, filename: string) => {
    if (!url || !filename) {
      console.error("Invalid URL or filename provided");
      return;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div
      key={file.name}
      className="flex items-center gap-2 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group w-full"
    >
      <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-md">
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div className="flex-1 w-[90%]">
        <p className="text-sm font-medium truncate break-all text-wrap text-gray-900 dark:text-gray-100">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {Math.round(file.size / 1024)}KB
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-100 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
        onClick={() => downloadFile(file.url, file.name)}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
