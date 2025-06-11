import { useEffect, useState } from "react";
import { CandidateCard } from "@/app/dashboard/jobs/[id]/components/Candidate/candidate-card";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { Assignment } from "@/app/dashboard/page";
import { Candidate, CandidateStatus, Remark } from "@/types/candidate";
// import useRoles from "@/hooks/useRoles";

function ActionItems({
  assignment,
  fetchAssignments,
}: {
  assignment: Assignment | Candidate;
  fetchAssignments: () => void;
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  // const role = useRoles();

  useEffect(() => {
    if (assignment) {
      if ("jobDetails" in assignment) {
        setCandidate(assignment as Candidate);
      } else {
        const transformedCandidate: Candidate = {
          _id: assignment._id || assignment.id,
          jobId: {
            _id: assignment.jobId._id || "",
            title: assignment.jobId.title,
            description: assignment.jobId.description || "",
            skills: assignment.jobId.skills || [],
          },
          name: assignment.candidateName || assignment.name,
          location: assignment.location,
          experience: assignment.experience,
          skills: assignment.skills,
          expectedCTC: assignment.expectedCTC,
          currentCTC: assignment.currentCTC,
          noticePeriod: assignment.noticePeriod,
          resume: assignment.resume,
          remarks: Array.isArray(assignment.remarks)
            ? assignment.remarks
            : ([assignment.remarks].filter(Boolean) as Remark[]),
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
          assignment: null,
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
        refetch={() => {}}
        onViewDetails={() => setIsDetailsOpen(true)}
        openRemarks={openRemarksFor === candidate._id}
        setOpenRemarksFor={setOpenRemarksFor}
        onDashboard={true}
      />
      <CandidateDetailsDialog
        candidate={candidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={() => {}}
        refetchAssignment={() => fetchAssignments()}
      />
    </>
  ) : null;
}

export default ActionItems;
