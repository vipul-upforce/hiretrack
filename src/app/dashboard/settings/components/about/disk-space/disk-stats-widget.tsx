import { Cloud, Database, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiskStats } from "@/lib/features/settings/settingsApi";

interface DiskStatsWidgetProps {
  stats: DiskStats;
}

export function DiskStatsWidget({ stats }: DiskStatsWidgetProps) {
  // Calculate percentage for progress bar logic
  const usagePercent = stats?.raw
    ? (stats.raw.used / stats.raw.total) * 100
    : 0;

  // Premium gradient styles
  const getProgressStyles = (percent: number) => {
    if (percent > 90) return "from-rose-500 to-red-600 shadow-rose-500/20";
    if (percent > 75)
      return "from-amber-400 to-orange-500 shadow-orange-500/20";
    return "from-blue-500 to-indigo-600 shadow-blue-500/20";
  };

  return (
    <div className="grid gap-4 md:grid-cols-12">
      {/* Main Storage Card - Spans 8 columns on desktop */}
      <div className="col-span-12 flex flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm transition-all hover:shadow-md md:col-span-7 lg:col-span-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4" /> System Storage
            </h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {stats.percentUsed}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                used
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/50 p-[1px]">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r shadow-lg transition-all duration-1000 ease-out",
                getProgressStyles(usagePercent)
              )}
              style={{ width: stats.percentUsed }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid - Spans 4 columns */}
      <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-5 md:grid-cols-1 lg:col-span-4 lg:grid-cols-1">
        {/* Total */}
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground">
              Total Capacity
            </p>
            <p className="font-mono text-lg font-bold tracking-tight">
              {stats.total}
            </p>
          </div>
        </div>

        {/* Available (Free) */}
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground">
              Available Free
            </p>
            <p className="font-mono text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.free}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
