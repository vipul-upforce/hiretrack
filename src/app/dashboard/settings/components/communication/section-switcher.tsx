import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SectionOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

interface SectionSwitcherProps {
  options: SectionOption[];
  activeId: string;
  onChange: (id: string) => void;
}

export function SectionSwitcher({
  options,
  activeId,
  onChange,
}: SectionSwitcherProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const isActive = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'group relative flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-all',
              'bg-white dark:bg-black',
              'hover:border-slate-300 dark:hover:border-slate-600',
              isActive
                ? 'border-primary bg-white shadow-sm dark:bg-black'
                : 'border-slate-200 dark:border-slate-800',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'rounded-lg border p-2 transition-colors',
                  isActive
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-black'
                    : 'border-transparent bg-slate-100 dark:bg-slate-900',
                )}
              >
                <option.icon
                  className={cn(
                    'h-5 w-5',
                    isActive
                      ? 'text-primary'
                      : 'text-slate-700 dark:text-slate-300',
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {option.title}
                  </p>
                  {option.badge && (
                    <Badge variant="secondary" className="text-[10px]">
                      {option.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
