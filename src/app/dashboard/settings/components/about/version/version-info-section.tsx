import { Badge } from '@/components/ui/badge';

export function VersionInfoSection({
  currentVersion,
  latestVersion,
  updateAvailable,
}: {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
}) {
  return (
    <div className="flex flex-row gap-3 px-5">
      <div
        className={`flex items-center justify-between rounded-md border bg-background p-3 ${
          latestVersion ? 'w-[50%]' : 'w-full'
        }`}
      >
        <span className="text-sm text-muted-foreground">Current Version</span>
        <Badge variant="secondary">{currentVersion}</Badge>
      </div>

      {latestVersion && (
        <div className="flex items-center justify-between rounded-md border bg-background p-3 w-[50%]">
          <span className="text-sm text-muted-foreground">Latest Version</span>
          <Badge variant={updateAvailable ? 'destructive' : 'default'}>
            {latestVersion}
          </Badge>
        </div>
      )}
    </div>
  );
}
