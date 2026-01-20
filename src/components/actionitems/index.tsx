import { useEffect, useState } from 'react';
import { CandidateCard } from '@/app/dashboard/jobs/[id]/components/Candidate/candidate-card';
import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { Candidate, CandidateStatus, Remark } from '@/types/candidate';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { useRefetchCandidateMutation } from '@/lib/features/candidate/candidateApi';

function ActionItems({
  assignment,
  setAssignments,
  assignments,
}: {
  assignment: Candidate;
  setAssignments: (a: Candidate[]) => void;
  assignments: Candidate[];
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  const [triggerRefetchCandidate] = useRefetchCandidateMutation();

  // Update local state with updated candidate (without making GET request)
  const updateCandidate = (updatedCandidate: Candidate) => {
    if (!updatedCandidate?._id) return;

    setCandidate(updatedCandidate);

    // Check if assignment is null or has null interviewerId - if so, remove from list
    const hasValidAssignment =
      updatedCandidate.assignment &&
      updatedCandidate.assignment.interviewerId !== null &&
      updatedCandidate.assignment.interviewerId !== undefined;

    const updatedAssignments = !hasValidAssignment
      ? assignments.filter((a) => a._id !== updatedCandidate._id)
      : assignments.map((a) =>
          a._id === updatedCandidate._id
            ? { ...a, ...updatedCandidate } // merge updated data
            : a,
        );
    setAssignments(updatedAssignments);
  };

  // Update assignments list (for dashboard list view)
  const updateAssignments = () => {
    // This is called to refresh the assignments list view
    // The individual candidate is already updated via updateCandidate
    // So we just need to trigger a re-render by updating assignments
    setAssignments([...assignments]);
  };

  // Candidate-specific refetch function (only used when we actually need to fetch from server)
  const refetchCandidate = async () => {
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
  };

  useEffect(() => {
    if (assignment) {
      if ('jobDetails' in assignment) {
        setCandidate(assignment as Candidate);
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
        };
        setCandidate(transformedCandidate);
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
        onViewDetails={() => setIsDetailsOpen(true)}
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
      />
      <CandidateDetailsDialog
        candidate={candidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={setCandidate}
        refetchAssignment={refetchCandidate}
      />
    </>
  ) : null;
}

export default ActionItems;
