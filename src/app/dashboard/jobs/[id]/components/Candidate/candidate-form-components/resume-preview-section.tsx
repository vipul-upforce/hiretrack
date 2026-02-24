'use client';

export function ResumePreviewSection({
  tempResumeUrl,
}: {
  tempResumeUrl: string | null;
}) {
  return (
    <div className="w-full lg:w-1/2 h-64 sm:h-80 lg:h-full">
      <div className="w-full h-full rounded-lg border overflow-hidden">
        {tempResumeUrl ? (
          <iframe
            src={tempResumeUrl}
            className="w-full h-full"
            title="Resume Preview"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Resume Preview Available
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Please upload resume to see a preview here!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
