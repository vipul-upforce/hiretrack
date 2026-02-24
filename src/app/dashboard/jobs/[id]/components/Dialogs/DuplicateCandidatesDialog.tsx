import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Candidate } from '@/types/candidate';
import {
  useGetDuplicateCandidatesQuery,
  useLazyFetchCandidateByIdQuery,
} from '@/lib/features/candidate/candidateApi';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  IndianRupee,
  User,
  Clock,
  Calendar,
  ChevronRight,
  Trash2,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logger from '@/lib/logger';

const STORAGE_KEY = 'duplicate_candidates_prefs';

interface DuplicateCandidatesDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onViewDetails: (candidate: Candidate) => void;
}

interface DuplicateEntry {
  candidateId: string;
  name: string;
  email: string;
  expectedCTC?: number;
  currentCTC?: number;
  experience?: number;
  relevantExperience?: number;
  jobId?: string;
  jobTitle?: string;
  appliedDate?: string;
  isDeleted?: boolean;
}

function DuplicateCandidateSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-6 py-4 last:border-0">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-2">
      <Skeleton className="h-7 w-28 rounded" />
      <Skeleton className="h-7 w-32 rounded" />
    </div>
  );
}

function InitialsAvatar({
  name,
  isDeleted,
}: {
  name: string;
  isDeleted?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1',
        isDeleted
          ? 'bg-destructive/10 text-destructive ring-destructive/20'
          : 'bg-primary/10 ring-primary/20 text-primary',
      )}
    >
      {initials}
    </div>
  );
}

export function DuplicateCandidatesDialog({
  candidate,
  isOpen,
  onOpenChange,
  onViewDetails,
}: DuplicateCandidatesDialogProps) {
  const { user: authUser } = useSelector(
    (state: RootState) => state.auth ?? { user: null },
  );
  const organizationId = authUser?.organizationId || '';

  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [showDeleted, setShowDeleted] = useState(true);
  const [isPrefsLoaded, setIsPrefsLoaded] = useState(false);

  useEffect(() => {
    const savedPrefs = localStorage.getItem(STORAGE_KEY);
    if (savedPrefs) {
      try {
        const { sort, show } = JSON.parse(savedPrefs);
        if (typeof sort === 'boolean') setSortNewestFirst(sort);
        if (typeof show === 'boolean') setShowDeleted(show);
      } catch (e) {
        logger.error('Failed to parse duplicate preferences', e);
      }
    }
    setIsPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (isPrefsLoaded) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sort: sortNewestFirst, show: showDeleted }),
      );
    }
  }, [sortNewestFirst, showDeleted, isPrefsLoaded]);

  const {
    data: duplicateData,
    isLoading,
    error,
  } = useGetDuplicateCandidatesQuery(
    {
      id: candidate._id,
      email: candidate.email,
      organizationId: organizationId as string,
    },
    {
      skip: !isOpen || !candidate.email || !organizationId,
      refetchOnMountOrArgChange: true,
    },
  );

  const filteredDuplicates = useMemo(() => {
    if (!duplicateData) return [];

    let result = duplicateData.filter(
      (duplicate) => duplicate.candidateId !== candidate._id,
    );

    if (!showDeleted) {
      result = result.filter((d) => !d.isDeleted);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.appliedDate || 0).getTime();
      const dateB = new Date(b.appliedDate || 0).getTime();
      return sortNewestFirst ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [duplicateData, candidate._id, showDeleted, sortNewestFirst]);

  const { toast } = useToast();
  const [triggerGetCandidate] = useLazyFetchCandidateByIdQuery();

  const handleViewDuplicateDetails = async (
    duplicateCandidate: DuplicateEntry,
  ) => {
    try {
      const fullCandidateData = await triggerGetCandidate(
        duplicateCandidate.candidateId,
      ).unwrap();

      if (fullCandidateData && fullCandidateData._id) {
        onViewDetails(fullCandidateData);
        onOpenChange(false);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch full candidate details.',
        variant: 'destructive',
      });
    }
  };

  let content;

  if (isLoading) {
    content = (
      <div>
        {[...Array(2)].map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <DuplicateCandidateSkeleton key={i} />
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <div className="m-6 flex h-20 items-center justify-center rounded-md bg-destructive/5 text-xs text-destructive">
        Unable to load duplicate data.
      </div>
    );
  } else if (filteredDuplicates.length > 0) {
    content = (
      <div className="flex flex-col">
        {filteredDuplicates.map((duplicate) => (
          <button
            type="button"
            key={duplicate.candidateId + duplicate.appliedDate}
            onClick={() => handleViewDuplicateDetails(duplicate)}
            className={cn(
              'group flex w-full items-center gap-4 border-b border-border/40 px-6 py-4 text-left transition-colors last:border-0',
              duplicate.isDeleted
                ? 'bg-destructive/5 hover:bg-destructive/10'
                : 'hover:bg-muted/50',
            )}
          >
            <InitialsAvatar
              name={duplicate.name}
              isDeleted={duplicate.isDeleted}
            />

            <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={cn(
                      'truncate text-sm font-semibold',
                      duplicate.isDeleted
                        ? 'text-muted-foreground decoration-destructive/50'
                        : 'text-foreground',
                    )}
                  >
                    {duplicate.name}
                  </span>

                  {duplicate.isDeleted && (
                    <span className="flex shrink-0 items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                      <Trash2 className="h-3 w-3" />
                      Deleted
                    </span>
                  )}

                  {duplicate.jobTitle && (
                    <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      {duplicate.jobTitle.split('|')[0].trim()}
                    </span>
                  )}
                  {!duplicate.jobTitle && (
                    <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      No Job Assigned
                    </span>
                  )}
                </div>

                {duplicate.appliedDate && (
                  <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(duplicate.appliedDate).toLocaleDateString(
                        undefined,
                        {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit',
                        },
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div
                className={cn(
                  'flex items-center gap-2 truncate text-[11px] text-muted-foreground',
                  duplicate.isDeleted && 'opacity-70',
                )}
              >
                {duplicate.experience !== undefined && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3 opacity-70" />
                    <span>{duplicate.experience}y</span>
                  </div>
                )}

                {duplicate.experience !== undefined &&
                  duplicate.relevantExperience !== undefined && (
                    <span className="opacity-30">•</span>
                  )}

                {duplicate.relevantExperience !== undefined && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 opacity-70" />
                    <span>{duplicate.relevantExperience}y Rel</span>
                  </div>
                )}

                {(duplicate.experience !== undefined ||
                  duplicate.relevantExperience !== undefined) &&
                  (duplicate.currentCTC !== undefined ||
                    duplicate.expectedCTC !== undefined) && (
                    <span className="opacity-30">•</span>
                  )}

                {duplicate.currentCTC !== undefined && (
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 opacity-70" />
                    <span>{duplicate.currentCTC}L Cur</span>
                  </div>
                )}

                {duplicate.currentCTC !== undefined &&
                  duplicate.expectedCTC !== undefined && (
                    <span className="opacity-30">•</span>
                  )}

                {duplicate.expectedCTC !== undefined && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground/80">
                      {duplicate.expectedCTC}L Exp
                    </span>
                  </div>
                )}
              </div>
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
    );
  } else {
    content = (
      <div className="flex h-32 flex-col items-center justify-center text-center">
        <User className="mb-2 h-8 w-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          {showDeleted ? 'No duplicates found.' : 'No active duplicates found.'}
        </p>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[550px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            Duplicate Profiles
          </DialogTitle>

          <DialogDescription className="text-xs">
            {isLoading ? (
              // FIX: Replaced <Skeleton /> (div) with styled <span> to prevent hydration error inside <p>
              <span className="mt-1 inline-block h-3 w-48 animate-pulse rounded bg-muted" />
            ) : (
              <>
                Found{' '}
                <span className="font-medium text-foreground">
                  {filteredDuplicates.length}
                </span>{' '}
                matches for{' '}
                <span className="font-medium text-foreground">
                  {candidate.email}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <ToolbarSkeleton />}
        {!isLoading && !error && (
          <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleted(!showDeleted)}
              className={cn(
                'h-7 gap-1.5 px-2 text-[10px]',
                showDeleted ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {showDeleted ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              {showDeleted ? 'Deleted Visible' : 'Deleted Hidden'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortNewestFirst(!sortNewestFirst)}
              className="h-7 gap-1.5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <span className="hidden sm:inline">Sort by:</span>
              {sortNewestFirst ? 'Newest' : 'Oldest'}
              {sortNewestFirst ? (
                <ArrowDownWideNarrow className="h-3 w-3" />
              ) : (
                <ArrowUpNarrowWide className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-[50vh] w-full">{content}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}