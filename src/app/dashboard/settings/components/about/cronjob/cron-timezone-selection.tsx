'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, Check, AlertCircle, ChevronsUpDown } from 'lucide-react';
import {
    useGetCronTimezoneQuery,
    useUpdateCronTimezoneMutation,
} from '@/lib/features/settings';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';

/**
 * Normalizes legacy timezones to modern equivalents for UI consistency.
 */
const NORMALIZE_MAP: Record<string, string> = {
    'Asia/Calcutta': 'Asia/Kolkata',
};

/**
 * Generate options
 */
const TIMEZONE_OPTIONS = Array.from(
    new Set([
        'UTC',
        ...Intl.supportedValuesOf('timeZone').map(
            (tz) => NORMALIZE_MAP[tz] || tz
        ),
    ])
).sort((a, b) => a.localeCompare(b));

export function CronTimezoneSection() {
    const { toast } = useToast();
    const [open, setOpen] = useState(false); // State for Popover visibility
    const [selectedTimezone, setSelectedTimezone] = useState<string>('');

    const {
        data,
        isLoading: isLoadingQuery,
        isError: isQueryError,
    } = useGetCronTimezoneQuery(undefined, {
        skip: false,
    });

    const [updateTimezone, { isLoading: isUpdating }] =
        useUpdateCronTimezoneMutation();

    // Normalize the server response immediately
    const rawTimezone = data?.timezone ?? '';
    const currentTimezone = NORMALIZE_MAP[rawTimezone] || rawTimezone;

    useEffect(() => {
        if (currentTimezone && !selectedTimezone) {
            setSelectedTimezone(currentTimezone);
        }
    }, [currentTimezone, selectedTimezone]);

    const isDirty = useMemo(
        () =>
            selectedTimezone.length > 0 &&
            currentTimezone.length > 0 &&
            selectedTimezone !== currentTimezone,
        [selectedTimezone, currentTimezone]
    );

    const handleSave = async () => {
        if (!selectedTimezone || !isDirty) return;
        try {
            await updateTimezone({ timezone: selectedTimezone }).unwrap();
            toast({
                title: 'Timezone Updated',
                description: `Maintenance schedule set to ${selectedTimezone}.`,
            });
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to update schedule maintenance timezone.',
                variant: 'destructive',
            });
        }
    };

    // Determine button content
    const buttonContent = (() => {
        if (isUpdating) {
            return <Loader2 className="h-4 w-4 animate-spin" />;
        }
        if (isDirty) {
            return 'Save';
        }
        return (
            <span className="flex items-center gap-1 text-muted-foreground">
                <Check className="h-3 w-3" /> Saved
            </span>
        );
    })();

    if (isLoadingQuery) {
        return (
            <div className="mx-auto mt-4 flex w-[95%] items-center justify-between rounded-lg border bg-background/50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                    </div>
                </div>
            </div>
        );
    }

    if (isQueryError) {
        return (
            <div className="mx-auto mt-4 flex w-[95%] items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                    Failed to load timezone settings.
                </span>
            </div>
        );
    }

    // Determine display value for the button
    const displayValue = selectedTimezone || currentTimezone;

    return (
        <div className="mx-auto mt-4 w-[95%] rounded-lg border bg-card text-card-foreground">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left Side: Icon & Info */}
                <div className="flex items-start gap-3 sm:items-center">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Globe className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-medium leading-none">
                            Maintenance Timezone
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Determines when scheduled cron jobs run.
                        </p>
                    </div>
                </div>

                {/* Right Side: Inputs & Actions */}
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">

                    {/* Combobox Implementation */}
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                disabled={isUpdating}
                                className="h-9 w-full justify-between bg-background font-normal sm:w-[240px]"
                            >
                                {displayValue || "Select timezone..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="end">
                            <Command>
                                <CommandInput placeholder="Search timezone..." />
                                <CommandList>
                                    <CommandEmpty>No timezone found.</CommandEmpty>
                                    <CommandGroup>
                                        {TIMEZONE_OPTIONS.map((tz) => (
                                            <CommandItem
                                                key={tz}
                                                value={tz}
                                                onSelect={() => {
                                                    setSelectedTimezone(tz);
                                                    setOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        displayValue === tz
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {tz}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={!isDirty || isUpdating}
                                    className={cn(
                                        'h-9 min-w-[80px] transition-all',
                                        !isDirty && 'opacity-50 grayscale'
                                    )}
                                    style={
                                        isDirty ? { backgroundColor: 'var(--portal-primary)' } : {}
                                    }
                                    variant={isDirty ? 'default' : 'secondary'}
                                >
                                    {buttonContent}
                                </Button>
                            </TooltipTrigger>
                            {!isDirty && (
                                <TooltipContent>
                                    <p>No changes to save</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}