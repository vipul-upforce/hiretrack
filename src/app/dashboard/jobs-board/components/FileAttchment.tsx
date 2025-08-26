import { Attachment } from "../../jobs/[id]/schemas/AssignCandidateSchema";

interface FileAttachmentProps {
  file: Attachment;
}

export function FileAttachment({ file }: FileAttachmentProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-grey-100 rounded-md">
          <svg
            className="w-5 h-5"
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
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{file.name}</span>
          <span className="text-xs text-gray-500">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
      <a
        href={file.url}
        download={file.name}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download
      </a>
    </div>
  );
}
