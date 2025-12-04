'use client';

import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { Candidate } from '@/types/candidate';
import {
  useEffect, useRef, useState, memo, useCallback, useMemo,
} from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { User } from '@/lib/features/users/usersApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { followUpSepretorPatternRegex } from '@/lib/constants';
import { useRemarkHandlers } from '../../hooks/useRemarkHandlers';
import { useUnassignHandlers } from '../../hooks/useUnassignHandlers';
import { CandidateCardHeader } from './CandidateCardHeader';
import { CandidateCardFollowUp } from './CandidateCardFollowUp';
import { CandidateCardInfo } from './CandidateCardInfo';
import { CandidateCardSkills } from './CandidateCardSkills';
import { CandidateCardCustomFields } from './CandidateCardCustomFields';
import { CandidateCardScores } from './CandidateCardScores';
import { CandidateCardAssignment } from './CandidateCardAssignment';
import { CandidateCardDialogs } from './CandidateCardDialogs';

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate: Candidate) => void;
  onDashboard?: boolean;
  onDeleteClick?: (candidateId: string) => void;
  openRemarks: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
  className?: string;
  onEditClick?: (candidate: Candidate) => void;
  isPending?: boolean; // New prop to indicate if card is awaiting checklist completion
  onAssignClick?: (candidate: Candidate) => void;
  onMarkAsDoneClick?: (candidate: Candidate) => void;
  onFollowUpClick?: (candidate: Candidate) => void;
  onAddRemarkClick?: (candidate: Candidate) => void;
}

const CandidateCard = memo(({
  candidate,
  index,
  onViewDetails,
  openRemarks,
  setOpenRemarksFor,
  refetch,
  onDashboard = false,
  onDeleteClick,
  className,
  onEditClick,
  onAssignClick,
  onMarkAsDoneClick,
  onFollowUpClick,
  onAddRemarkClick,
  isPending = false,
}: CandidateCardProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { user } = useSelector((state: any) => state.auth || {});
  const [removeFUOpen, setRemoveFUOpenLocal] = useState(false);
  const { toast } = useToast();
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);

  // Local state for candidate data to handle sync updates
  const [localCandidate, setLocalCandidate] = useState(candidate);
  const [isSyncing, setIsSyncing] = useState(false);

  // State for menu actions
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  // Update local candidate when prop changes
  useEffect(() => {
    setLocalCandidate(candidate);
  }, [candidate]);

  const handlePopoverContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handlers for menu actions
  const {
    newRemark,
    setNewRemark,
    remarkRating,
    setRemarkRating,
    setRemarkRatingHistory,
    isSubRemarkPrivate,
    setIsSubRemarkPrivate,
    handleRemarkUpdate,
    isRemarkSubmitting,
    handleAddRemark,
    handleAddFollowUp,
    handleRemoveFollowUp,
    setNewFollowUp,
    setNewFollowUpDate,
    newFollowUp,
    newFollowUpDate,
    MADFollowup,
    setMADFollowup,
    isFollowUpSubmitting,
  } = useRemarkHandlers(
    localCandidate, // Use localCandidate instead of candidate
    user,
    async () => refetch(),
    undefined,
    undefined,
    undefined,
  );

  const { isLoading, handleUnassign, confirmUnassign } = useUnassignHandlers(
    localCandidate, // Use localCandidate instead of candidate
    user,
    async () => refetch(),
    () => {},
    () => {},
    undefined,
    undefined,
  );
  const [candidateToAssignJob, setCandidateToAssignJob] = useState<Candidate | null>(null);
  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);
  const onAddRemarkOpenChange = () => {
    // debugger;
    setOpenRemarksFor(null);
    setIsAddRemarkOpen(false);
  };

  // Function to handle sync attendee responses
  const handleSyncAttendeeResponses = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!localCandidate.assignment?.googleMeet?.eventId) {
        toast({
          title: 'Sync Failed',
          description: 'No event ID found for this meeting.',
          variant: 'destructive',
        });
        return;
      }

      setIsSyncing(true);

      try {
        const response = await fetch('/api/google-calendar/sync-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidateId: localCandidate._id,
            eventId: localCandidate.assignment.googleMeet.eventId,
          }),
        });

        if (response.ok) {
          const syncData = await response.json();

          // Update local candidate with new attendee responses
          if (syncData.success && syncData.data.attendeeResponses) {
            setLocalCandidate((prevCandidate) => ({
              ...prevCandidate,
              assignment: {
                ...prevCandidate.assignment!,
                googleMeet: {
                  ...prevCandidate.assignment!.googleMeet!,
                  attendeeResponses: syncData.data.attendeeResponses,
                },
              },
            }));
          }

          toast({
            title: 'Sync Successful',
            description:
              syncData.data.notificationsSent > 0
                ? `Updated attendee responses. ${syncData.data.notificationsSent} notifications sent.`
                : syncData.data.changesDetected
                  ? 'Attendee responses updated successfully.'
                  : 'Attendee responses are up to date.',
          });
        } else {
          throw new Error('Sync failed');
        }
      } catch (error) {
        console.error('Sync error:', error);
        toast({
          title: 'Sync Failed',
          description: 'Unable to sync attendee responses. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [localCandidate._id, localCandidate.assignment?.googleMeet?.eventId, toast],
  );

  // Calculate average score across all categories - memoized for performance
  const { averageScore, showStar, showRedFlag } = useMemo(() => {
    if (!localCandidate.scores) return { averageScore: 0, showStar: false, showRedFlag: false };

    const scores = [
      localCandidate.scores.overall,
      localCandidate.scores.experience,
      localCandidate.scores.skills,
      localCandidate.scores.affordability,
    ].filter((score) => score !== undefined && score >= 0);

    if (scores.length === 0) return { averageScore: 0, showStar: false, showRedFlag: false };

    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return {
      averageScore: avg,
      showStar: avg > 7,
      showRedFlag: avg < 4,
    };
  }, [localCandidate.scores]);

  // Copy to clipboard function
  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: 'Copied!',
          description: `${label} copied to clipboard`,
          duration: 2000,
        });
      } catch (err) {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy to clipboard',
          variant: 'destructive',
          duration: 2000,
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    if (isAddingFollowUp) {
      console.log(
        localCandidate?.followUp?.note,
        'localCandidate?.followUp?.note',
      );

      const parts = localCandidate?.followUp?.note
        ? localCandidate.followUp.note
          .split(followUpSepretorPatternRegex)
          .map((p) => p.trim())
          .filter(Boolean)
        : [];
      console.log(parts, 'Parts --=  ');

      const followUpParts = parts.filter((p) => {
        if (p.endsWith('has completed the last step.')) {
          setMADFollowup(p);
          return false;
        }
        return true;
      });

      // use the most recent follow-up note for editing, or empty string
      const userNote = followUpParts.length > 0 ? followUpParts[followUpParts.length - 1] : '';
      setNewFollowUp(userNote);

      if (localCandidate?.followUp?.date) {
        setNewFollowUpDate(dayjs(localCandidate.followUp.date));
      } else {
        setNewFollowUpDate(null);
      }
    }
  }, [isAddingFollowUp, localCandidate]);

  const handleAssignJob = useCallback((candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setCandidateToAssignJob(candidate);
    setIsAssignJobOpen(true);
  }, []);

  const renderCardContent = useMemo(
    () => (
      <div className="flex flex-col h-full relative">
        <div className="flex-1 flex flex-col">
          <CandidateCardHeader
            candidate={localCandidate}
            user={user}
            showStar={showStar}
            showRedFlag={showRedFlag}
            onViewDetails={onViewDetails}
            setOpenRemarksFor={setOpenRemarksFor}
            setIsAddRemarkOpen={setIsAddRemarkOpen}
            setIsEditing={setIsEditing}
            setIsEmailDialogOpen={setIsEmailDialogOpen}
            setIsShareDialogOpen={setIsShareDialogOpen}
            setIsAssigning={setIsAssigning}
            setIsTagsOpen={setIsTagsOpen}
            setConfirmUnassignOpen={setConfirmUnassignOpen}
            setIsAddingFollowUp={setIsAddingFollowUp}
            onDashboard={onDashboard}
            onDeleteClick={onDeleteClick}
            handleAssignJob={handleAssignJob}
            handlePopoverContentClick={handlePopoverContentClick}
          />

          <CandidateCardFollowUp
            candidate={localCandidate}
            user={user}
            onEdit={() => setIsAddingFollowUp(true)}
            onRemove={() => setRemoveFUOpenLocal(true)}
          />

          <CandidateCardInfo
            candidate={localCandidate}
            onCopy={copyToClipboard}
          />

          <CandidateCardSkills candidate={localCandidate} />

          <CandidateCardCustomFields candidate={localCandidate} />
        </div>

        <div className="mt-auto">
          <CandidateCardScores candidate={localCandidate} />
        </div>

        <CandidateCardAssignment
          candidate={localCandidate}
          isSyncing={isSyncing}
          onSync={handleSyncAttendeeResponses}
          onAssignClick={(e) => {
            e.stopPropagation();
            setIsAssigning(true);
          }}
          onCopy={copyToClipboard}
        />
      </div>
    ),
    [
      localCandidate,
      showStar,
      showRedFlag,
      user,
      onViewDetails,
      setOpenRemarksFor,
      setIsAddRemarkOpen,
      setIsEditing,
      setIsEmailDialogOpen,
      setIsShareDialogOpen,
      setIsAssigning,
      setIsTagsOpen,
      setConfirmUnassignOpen,
      setIsAddingFollowUp,
      onDashboard,
      onDeleteClick,
      handleAssignJob,
      handlePopoverContentClick,
      copyToClipboard,
      isSyncing,
      handleSyncAttendeeResponses,
    ],
  );

  return (
    <>
      {onDashboard ? (
        <div
          className={cn(
            'bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 h-full hover:border-gray-300 dark:hover:border-gray-700 w-[420px] flex-shrink-0',
            className,
          )}
          onClick={useCallback(
            (e) => {
              // Check if click target is a button or inside a dropdown/interactive element
              const target = e.target as HTMLElement;
              if (
                target.closest('button')
                || target.closest('[role="menuitem"]')
                || target.closest('[data-radix-collection-item]')
                || target.closest('[data-radix-popper-content]')
                || target.closest('[data-state]')
                || target.closest(
                  '.cursor-pointer:not(.bg-white):not(.dark\\:bg-black)',
                )
                || target.closest('a')
                || target.tagName === 'BUTTON'
              ) {
                return; // Don't open details if clicking on interactive elements
              }

              // Always open details when clicking on card content
              onViewDetails(localCandidate);
            },
            [onViewDetails, localCandidate],
          )}
        >
          {renderCardContent}
        </div>
      ) : (
        <Draggable draggableId={localCandidate._id} index={index}>
          {(provided: DraggableProvided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={cn(
                'bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing relative overflow-visible hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-700',
                isPending && 'opacity-50',
                className,
              )}
              onClick={useCallback(
                (e) => {
                  // Only trigger on actual click, not on drag
                  if (e.detail === 0) return; // Ignore programmatic clicks

                  // Check if click target is a button or inside a dropdown/interactive element
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button')
                    || target.closest('[role="menuitem"]')
                    || target.closest('[data-radix-collection-item]')
                    || target.closest('[data-radix-popper-content]')
                    || target.closest('[data-state]')
                    || target.closest(
                      '.cursor-pointer:not(.bg-white):not(.dark\\:bg-black)',
                    )
                    || target.closest('a')
                    || target.tagName === 'BUTTON'
                  ) {
                    return; // Don't open details if clicking on interactive elements
                  }

                  // Always open details when clicking on card content
                  onViewDetails(localCandidate);
                },
                [onViewDetails, localCandidate],
              )}
            >
              {renderCardContent}
            </div>
          )}
        </Draggable>
      )}

      <CandidateCardDialogs
        candidate={localCandidate}
        user={user}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isAssigning={isAssigning}
        setIsAssigning={setIsAssigning}
        isAddingFollowUp={isAddingFollowUp}
        setIsAddingFollowUp={setIsAddingFollowUp}
        confirmUnassignOpen={confirmUnassignOpen}
        setConfirmUnassignOpen={setConfirmUnassignOpen}
        isAddRemarkOpen={isAddRemarkOpen}
        setIsAddRemarkOpen={setIsAddRemarkOpen}
        isEmailDialogOpen={isEmailDialogOpen}
        setIsEmailDialogOpen={setIsEmailDialogOpen}
        isTagsOpen={isTagsOpen}
        setIsTagsOpen={setIsTagsOpen}
        isShareDialogOpen={isShareDialogOpen}
        setIsShareDialogOpen={setIsShareDialogOpen}
        isAssignJobOpen={isAssignJobOpen}
        setIsAssignJobOpen={setIsAssignJobOpen}
        candidateToAssignJob={candidateToAssignJob}
        setCandidateToAssignJob={setCandidateToAssignJob}
        removeFUOpen={removeFUOpen}
        setRemoveFUOpen={setRemoveFUOpenLocal}
        refetch={refetch}
        handleRemoveFollowUp={handleRemoveFollowUp}
        handleAddFollowUp={handleAddFollowUp}
        confirmUnassign={confirmUnassign}
        isLoading={isLoading}
        isFollowUpSubmitting={isFollowUpSubmitting}
        newFollowUp={newFollowUp}
        setNewFollowUp={setNewFollowUp}
        newFollowUpDate={newFollowUpDate}
        setNewFollowUpDate={setNewFollowUpDate}
        onDashboard={onDashboard}
        setOpenRemarksFor={setOpenRemarksFor}
        triggerRef={triggerRef}
      />
    </>
  );
});

export { CandidateCard };
