import { useEffect, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { CandidateCard } from '@/app/dashboard/jobs/[id]/components/Candidate/candidate-card';
import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { Candidate, CandidateStatus, Remark } from '@/types/candidate';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useRefetchCandidateMutation,
  useBulkUpdateCandidatesMutation,
} from '@/lib/features/candidate/candidateApi';
import { useGlobalChecklistValidation } from '@/hooks/useGlobalChecklistValidation';
import ChecklistRemarksDialog from '@/app/dashboard/jobs/[id]/components/Dialogs/checklist-remarks-components/checklist-remarks-dialog';

function ActionItems({
  assignment,
  setAssignments,
  assignments: _assignments, // Prefixed with _ as it's intentionally unused (SSE handles updates)
}: {
  assignment: Candidate;
  setAssignments: Dispatch<SetStateAction<Candidate[]>>;
  assignments: Candidate[];
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // New state to hold the candidate for the details dialog, separate from the card's candidate
  const [candidateForDetailsDialog, setCandidateForDetailsDialog] =
    useState<Candidate | null>(null);

  const [triggerRefetchCandidate] = useRefetchCandidateMutation();
  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();

  const currentJobId =
    typeof candidate?.jobId === 'object'
      ? candidate?.jobId?._id
      : candidate?.jobId;

  const checklistValidation = useGlobalChecklistValidation(currentJobId as string);

  /**
   * Update local state with updated candidate (without making GET request).
   * 
   * IMPORTANT: When a candidate's assignment is cleared (markAsDone), we do NOT
   * remove it from `assignments` here. Instead, we let SSE Effect 4 handle the
   * removal. This is critical because:
   * 
   * 1. SSE is the single source of truth for assignment removals
   * 2. Having two mechanisms (direct update + SSE) causes race conditions
   * 3. The details dialog works correctly because it follows this pattern
   * 
   * We only update local component state (candidate, candidateForDetailsDialog)
   * and update existing candidates in the list (but don't remove them).
   */
  const updateCandidate = useCallback((updatedCandidate: Candidate) => {
    if (!updatedCandidate?._id) return;

    setCandidate((prev) => 
      prev?._id === updatedCandidate._id 
        ? { ...prev, ...updatedCandidate } 
        : updatedCandidate
    );

    // Also update candidateForDetailsDialog if it's currently showing this candidate
    setCandidateForDetailsDialog((prev) => {
      if (prev?._id === updatedCandidate._id) {
        return { ...prev, ...updatedCandidate };
      }
      return prev;
    });

    // Check if assignment is null or has null interviewerId
    const hasValidAssignment =
      updatedCandidate.assignment &&
      updatedCandidate.assignment.interviewerId !== null &&
      updatedCandidate.assignment.interviewerId !== undefined;

    // Only UPDATE existing candidates in list, do NOT remove them
    // Removal is handled exclusively by SSE Effect 4 to avoid race conditions
    if (hasValidAssignment) {
      setAssignments((prevAssignments) =>
        prevAssignments.map((a) =>
          a._id === updatedCandidate._id
            ? { ...a, ...updatedCandidate }
            : a,
        ),
      );
    }
  }, [setAssignments]);

  // Update assignments list (for dashboard list view)
  // NOTE: This is intentionally a no-op now. When markAsDone is triggered:
  // 1. We don't want to spread stale closure data which could re-add the candidate
  // 2. SSE Effect 4 handles the removal as the single source of truth
  // 3. The functional update pattern ensures we work with latest state
  const updateAssignments = useCallback(() => {
    // Intentionally empty - let SSE handle all assignment list updates
    // to avoid race conditions with stale closure data
  }, []);

  // Candidate-specific refetch function (only used when we actually need to fetch from server)
  const refetchCandidate = useCallback(async () => {
    if (!candidate?._id) return;

    try {
      const updatedCandidate = await triggerRefetchCandidate(
        candidate._id,
      ).unwrap();

      updateCandidate(updatedCandidate);
      toast({
        title: 'Success',
        description: 'Candidate data refreshed successfully',
      });
    } catch (error) {
      logger.error('Failed to refetch candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh candidate data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [candidate?._id, triggerRefetchCandidate, updateCandidate]);

  const handleApplyDeferredStatus = useCallback(
    (candidateId: string, newStatus: string) =>
      bulkUpdateCandidates({
        operation: 'statusUpdate',
        candidateIds: [String(candidateId)],
        status: newStatus,
      })
        .unwrap()
        .then(() => refetchCandidate())
        .then(() => {
          const nextChecklist =
            checklistValidation.pendingIncomingChecklistAfterStatus;
          if (
            nextChecklist &&
            checklistValidation.setOpenRemarksFor &&
            checklistValidation.setPendingIncomingChecklistAfterStatus
          ) {
            checklistValidation.setOpenRemarksFor(nextChecklist);
            checklistValidation.setPendingIncomingChecklistAfterStatus(null);
          }
        })
        .finally(() => {
          checklistValidation.setPendingStatusAfterChecklist(null);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to update status';
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
          throw err;
        }),
    [
      bulkUpdateCandidates,
      refetchCandidate,
      checklistValidation.pendingIncomingChecklistAfterStatus,
      checklistValidation.setOpenRemarksFor,
      checklistValidation.setPendingIncomingChecklistAfterStatus,
      checklistValidation.setPendingStatusAfterChecklist,
    ],
  );

  const handleChecklistComplete = useCallback(
    (candidateId: string) => {
      const pending = checklistValidation.pendingStatusAfterChecklistRef.current;
      if (
        !pending ||
        String(pending.candidateId) !== String(candidateId) ||
        !checklistValidation.setPendingStatusAfterChecklist
      ) {
        return;
      }
      const { newStatus } = pending;
      bulkUpdateCandidates({
        operation: 'statusUpdate',
        candidateIds: [String(candidateId)],
        status: newStatus,
      })
        .unwrap()
        .then(() => refetchCandidate())
        .then(() => {
          const nextChecklist =
            checklistValidation.pendingIncomingChecklistAfterStatus;
          if (
            nextChecklist &&
            checklistValidation.setOpenRemarksFor &&
            checklistValidation.setPendingIncomingChecklistAfterStatus
          ) {
            checklistValidation.setOpenRemarksFor(nextChecklist);
            checklistValidation.setPendingIncomingChecklistAfterStatus(null);
          }
        })
        .finally(() => {
          checklistValidation.setPendingStatusAfterChecklist(null);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to update status';
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
        });
    },
    [
      checklistValidation.pendingStatusAfterChecklistRef,
      checklistValidation.setPendingStatusAfterChecklist,
      checklistValidation.pendingIncomingChecklistAfterStatus,
      checklistValidation.setOpenRemarksFor,
      checklistValidation.setPendingIncomingChecklistAfterStatus,
      bulkUpdateCandidates,
      refetchCandidate,
    ],
  );

  useEffect(() => {
    if (assignment) {
      if ('jobDetails' in assignment) {
        setCandidate(assignment as Candidate);
        
        // ONLY update the details candidate if it matches the current assignment ID
        setCandidateForDetailsDialog((prev) => {
          if (!prev || prev._id === (assignment as Candidate)._id) {
            return assignment as Candidate;
          }
          return prev;
        });
      } else {
        const transformedCandidate: Candidate = {
          _id: assignment._id,
          jobId: {
            _id: assignment.jobId._id || '',
            title: assignment.jobId.title,
            description: assignment.jobId.description || '',
            skills: assignment.jobId.skills || [],
          },
          name: assignment.candidateName || assignment.name,
          location: assignment.location,
          experience: assignment.experience,
          relevantExperience: assignment.relevantExperience,
          skills: assignment.skills,
          expectedCTC: assignment.expectedCTC,
          contact: assignment.contact,
          currentCTC: assignment.currentCTC,
          noticePeriod: assignment.noticePeriod,
          resume: assignment.resume,
          remarks: Array.isArray(assignment.remarks)
            ? assignment.remarks
            : ([assignment.remarks].filter(Boolean) as unknown as Remark[]),
          attachments: assignment.attachments || [],
          status: assignment.status as CandidateStatus,
          tracking: assignment.tracking,
          customFields: assignment.customFields,
          jobDetails: {
            title: assignment.jobId.title,
            description: assignment.jobId.description,
          },
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
          tags: assignment.tags,
          assignment: (assignment as Candidate).assignment || null,
          history: (assignment as Candidate).history || [],
          email: (assignment as Candidate).email,
          scores: (assignment as Candidate).scores || undefined,
          organizationId: assignment.organizationId || undefined,
          isDeleted: (assignment as Candidate).isDeleted || false,
          followUp: (assignment as Candidate).followUp,
          duplicateCount: (assignment as Candidate).duplicateCount || 0,
        };
        setCandidate(transformedCandidate);

        // ONLY update the details candidate if it matches the current assignment ID
        // This prevents blowing away a duplicate candidate dialog when the main card receives an SSE update
        setCandidateForDetailsDialog((prev) => {
          if (!prev || prev._id === transformedCandidate._id) {
            return transformedCandidate;
          }
          return prev;
        });
      }
    }
  }, [assignment]);

  return candidate ? (
    <>
      <CandidateCard
        key={candidate._id}
        candidate={candidate}
        index={0}
        refetch={refetchCandidate}
        onViewDetails={(candidateToView?: Candidate) => {
          // Set the candidate for the details dialog (either the duplicate or the main card candidate)
          setCandidateForDetailsDialog(candidateToView || candidate);
          setIsDetailsOpen(true); // Open the dialog
        }}
        openRemarks={openRemarksFor === candidate._id}
        setOpenRemarksFor={setOpenRemarksFor}
        onDashboard
        onUpdate={updateCandidate}
        refetchAssignment={updateAssignments}
        onEditClick={() => {
          // Handle edit - could open edit dialog
        }}
        onAssignClick={() => {
          // Handle assign - could open assign dialog
        }}
        onMarkAsDoneClick={() => {
          // Handle mark as done
        }}
        onFollowUpClick={() => {
          // Handle follow up
        }}
        onAddRemarkClick={() => {
          // Handle add remark
        }}
        onValidateStatusChange={checklistValidation.onValidateStatusChange}
        onDeferStatusToChecklist={checklistValidation.onDeferStatusToChecklist}
        onOpenChecklistAfterSave={checklistValidation.onOpenChecklistAfterSave}
      />

      {isDetailsOpen && candidateForDetailsDialog && (
        <CandidateDetailsDialog
          isAssigning={false}
          setIsAssigning={() => { }}
          candidate={candidateForDetailsDialog}
          isOpen={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) {
              setCandidateForDetailsDialog(null);
            }
          }}
          onUpdate={setCandidateForDetailsDialog}
          refetchAssignment={refetchCandidate}
          onViewDetails={(next) => {
            // Manual close and reopen to ensure fresh instance
            setIsDetailsOpen(false);
            setCandidateForDetailsDialog(null);
            
            setTimeout(() => {
              setCandidateForDetailsDialog(next);
              setIsDetailsOpen(true);
            }, 100);
          }}
          onValidateStatusChange={checklistValidation.onValidateStatusChange}
          onDeferStatusToChecklist={checklistValidation.onDeferStatusToChecklist}
          onOpenChecklistAfterSave={checklistValidation.onOpenChecklistAfterSave}
        />
      )}

      {candidate && checklistValidation.openRemarksFor && (
        <ChecklistRemarksDialog
          candidate={candidateForDetailsDialog || candidate}
          isOpen={!!checklistValidation.openRemarksFor}
          onOpenChange={(open) => {
            if (!open) checklistValidation.setOpenRemarksFor(null);
          }}
          setOpenRemarksFor={checklistValidation.setOpenRemarksFor}
          refetch={refetchCandidate}
          checklistInfo={checklistValidation.openRemarksFor}
          onChecklistSuccess={handleChecklistComplete}
          onApplyDeferredStatus={handleApplyDeferredStatus}
          onChecklistCancel={() => {
            checklistValidation.setPendingStatusAfterChecklist(null);
            checklistValidation.setPendingIncomingChecklistAfterStatus(null);
          }}
        />
      )}
    </>
  ) : null;
}

export default ActionItems;
