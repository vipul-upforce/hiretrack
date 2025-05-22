import { useEffect, useState } from "react";
import { CandidateCard } from "@/app/dashboard/jobs/[id]/components/Candidate/candidate-card";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { Assignment } from "@/app/dashboard/page";
import { Candidate, CandidateStatus } from "@/types/candidate";

function ActionItems({
  assignment,
  fetchAssignments,
}: {
  assignment: Assignment;
  fetchAssignments: () => void;
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Assignment | null>(null);

  useEffect(() => {
    if (assignment) {
      setCandidate({
        ...assignment,
        _id: assignment._id || assignment.id,
        jobId: {
          _id: assignment.jobId._id || "",
          title: assignment.jobId.title,
          description: assignment.jobId.description || "",
          skills: assignment.jobId.skills,
        },
        resume: assignment.resume,
        remarks: assignment.remarks,
        status: assignment.status as CandidateStatus,
      });
    }
  }, [assignment]);

  //   console.log(candidate,"assignment");

  return candidate ? (
    <>
      <CandidateCard
        key={candidate._id}
        candidate={candidate as unknown as Candidate}
        index={0}
        refetch={() => {}}
        onViewDetails={() => setIsDetailsOpen(true)}
        openRemarks={openRemarksFor === candidate._id}
        setOpenRemarksFor={setOpenRemarksFor}
        onDashboard={true}
      />
      <CandidateDetailsDialog
        candidate={candidate as unknown as Candidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={() => {}}
        refetchAssignment={() => fetchAssignments()}
      />
    </>
  ) : null;
}

export default ActionItems;
