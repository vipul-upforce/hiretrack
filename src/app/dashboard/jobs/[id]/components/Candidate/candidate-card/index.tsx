'use client';

import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import React, { useRef, memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { User } from '@/lib/features/users/usersApi';
import { useRemarkHandlers } from '../../../hooks/useRemarkHandlers';
import { useUnassignHandlers } from '../../../hooks/useUnassignHandlers';
import { CandidateCardHeader } from '../CandidateCardHeader';
import { CandidateCardFollowUp } from '../CandidateCardFollowUp';
import { CandidateCardInfo } from '../CandidateCardInfo';
import { CandidateCardSkills } from '../CandidateCardSkills';
import { CandidateCardCustomFields } from '../CandidateCardCustomFields';
import { CandidateCardScores } from '../CandidateCardScores';
import { CandidateCardAssignment } from '../CandidateCardAssignment';
import { CandidateCardDialogs } from '../CandidateCardDialogs';
import { CandidateCardProps } from './types';
import { useCandidateCardState } from './hooks/useCandidateCardState';
import { useCandidateCardSync } from './hooks/useCandidateCardSync';
import { useCandidateCardHandlers } from './hooks/useCandidateCardHandlers';
import { useCandidateCardCalculations } from './hooks/useCandidateCardCalculations';
import { useCandidateCardEffects } from './hooks/useCandidateCardEffects';

export const CandidateCard = memo(
  ({
    candidate,
    index,
    onViewDetails,
    openRemarks: _openRemarks,
    setOpenRemarksFor,
    refetch,
    onDashboard = false,
    onDeleteClick,
    className,
    onEditClick: _onEditClick,
    onAssignClick: _onAssignClick,
    onMarkAsDoneClick: _onMarkAsDoneClick,
    onFollowUpClick: _onFollowUpClick,
    onAddRemarkClick: _onAddRemarkClick,
    isPending = false,
  }: CandidateCardProps) => {
    const triggerRef = useRef<HTMLButtonElement>(
      null,
    ) as React.RefObject<HTMLButtonElement>;
    const { user: authUser } = useSelector(
      (state: RootState) => state.auth ?? { user: null },
    );
    // Type assertion: ILocalUser is compatible with User at runtime
    // Using double cast to satisfy TypeScript's structural type checking
    const user = (authUser as unknown as User | null) ?? null;

    // State management
    const {
      localCandidate,
      setLocalCandidate,
      isSyncing,
      setIsSyncing,
      isEditing,
      setIsEditing,
      isAssigning,
      setIsAssigning,
      isAddingFollowUp,
      setIsAddingFollowUp,
      confirmUnassignOpen,
      setConfirmUnassignOpen,
      isEmailDialogOpen,
      setIsEmailDialogOpen,
      isTagsOpen,
      setIsTagsOpen,
      isShareDialogOpen,
      setIsShareDialogOpen,
      isAddRemarkOpen,
      setIsAddRemarkOpen,
      removeFUOpen,
      setRemoveFUOpen,
      candidateToAssignJob,
      setCandidateToAssignJob,
      isAssignJobOpen,
      setIsAssignJobOpen,
    } = useCandidateCardState(candidate);

    // Sync functionality
    const { handleSyncAttendeeResponses } = useCandidateCardSync({
      localCandidate,
      setLocalCandidate,
      setIsSyncing,
    });

    // Event handlers
    const {
      copyToClipboard,
      handlePopoverContentClick,
      handleAssignJob,
      handleDashboardCardClick,
      handleDraggableCardClick,
    } = useCandidateCardHandlers({
      localCandidate,
      onViewDetails,
      setCandidateToAssignJob,
      setIsAssignJobOpen,
    });

    // Score calculations
    const { showStar, showRedFlag } =
      useCandidateCardCalculations(localCandidate);

    // Handlers for menu actions
    const {
      newRemark: _newRemark,
      setNewRemark: _setNewRemark,
      remarkRating: _remarkRating,
      setRemarkRating: _setRemarkRating,
      setRemarkRatingHistory: _setRemarkRatingHistory,
      isSubRemarkPrivate: _isSubRemarkPrivate,
      setIsSubRemarkPrivate: _setIsSubRemarkPrivate,
      handleRemarkUpdate: _handleRemarkUpdate,
      isRemarkSubmitting: _isRemarkSubmitting,
      handleAddRemark: _handleAddRemark,
      handleAddFollowUp,
      handleRemoveFollowUp,
      setNewFollowUp,
      setNewFollowUpDate,
      newFollowUp,
      newFollowUpDate,
      MADFollowup: _MADFollowup,
      setMADFollowup,
      isFollowUpSubmitting,
    } = useRemarkHandlers(
      localCandidate,
      async () => refetch(),
      undefined,
      undefined,
      undefined,
    );

    const {
      isLoading,
      handleUnassign: _handleUnassign,
      confirmUnassign,
    } = useUnassignHandlers(
      localCandidate,
      async () => refetch(),
      () => {},
      () => {},
      undefined,
      undefined,
    );

    // Side effects
    useCandidateCardEffects({
      candidate,
      localCandidate,
      isAddingFollowUp,
      setLocalCandidate,
      setNewFollowUp,
      setNewFollowUpDate,
      setMADFollowup,
    });

    const renderCardContent = useMemo(
      () => (
        <div className="relative flex h-full flex-col">
          <div className="flex flex-1 flex-col">
            <CandidateCardHeader
              candidate={localCandidate}
              user={user as User | null}
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
              user={user as User | null}
              onEdit={() => setIsAddingFollowUp(true)}
              onRemove={() => setRemoveFUOpen(true)}
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
        setRemoveFUOpen,
      ],
    );

    return (
      <>
        {onDashboard ? (
          <div
            role="button"
            tabIndex={0}
            className={cn(
              'h-full w-[420px] flex-shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-black dark:hover:border-gray-700',
              className,
            )}
            onClick={handleDashboardCardClick}
          >
            {renderCardContent}
          </div>
        ) : (
          <Draggable draggableId={localCandidate._id} index={index}>
            {(provided: DraggableProvided) => (
              <div
                role="button"
                tabIndex={0}
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={cn(
                  'relative cursor-grab overflow-visible rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:cursor-grabbing dark:border-gray-800 dark:bg-black dark:hover:border-gray-700',
                  isPending && 'opacity-50',
                  className,
                )}
                onClick={handleDraggableCardClick}
              >
                {renderCardContent}
              </div>
            )}
          </Draggable>
        )}

        <CandidateCardDialogs
          candidate={localCandidate}
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
          setRemoveFUOpen={setRemoveFUOpen}
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
          triggerRef={triggerRef}
        />
      </>
    );
  },
);
