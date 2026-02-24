import { FileX } from 'lucide-react';

export function EmptyLogState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-muted/50">
      <FileX className="mb-2 h-10 w-10 text-muted-foreground/50" />
      <p className="mb-1 text-lg font-semibold text-muted-foreground">
        No logs available
      </p>
      <p className="text-sm text-muted-foreground/70">
        The log file is empty or could not be read.
      </p>
    </div>
  );
}
