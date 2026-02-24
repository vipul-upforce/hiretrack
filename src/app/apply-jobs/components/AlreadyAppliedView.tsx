import { Button } from '@/components/ui/button';

interface AlreadyAppliedViewProps {
  onClose: () => void;
}

export function AlreadyAppliedView({ onClose }: AlreadyAppliedViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center sm:p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-green-100 sm:h-40 sm:w-40">
          <svg
            className="h-16 w-16 text-green-600 sm:h-20 sm:w-20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold sm:text-xl">
          Application Already Submitted
        </h3>
        <p className="mb-4 text-sm text-muted-foreground sm:text-base">
          We&apos;ve received your application for this job. No further action
          is needed at this time.
        </p>
        <Button onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </div>
  );
}
