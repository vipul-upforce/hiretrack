import { useEffect, useState } from "react";
import { CandidateCard } from "@/app/dashboard/jobs/[id]/components/Candidate/candidate-card";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { Assignment } from "@/app/dashboard/page";
import { Candidate, CandidateStatus, Remark } from "@/types/candidate";
import { toast } from "@/hooks/use-toast";

function ActionItems({
  assignment,
  fetchAssignments,
  setAssignments,
  assignments,
}: {
  assignment: Assignment | Candidate;
  fetchAssignments: () => void;
  setAssignments: any;
  assignments: (Assignment | Candidate)[];
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // Candidate-specific refetch function
  const refetchCandidate = async () => {
    if (!candidate?._id) return;

    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch candidate");
      }

      const updatedCandidate: Candidate = await response.json();
      setCandidate(updatedCandidate);
      const updatedAssignments = assignments.map((assignment) =>
        assignment._id === updatedCandidate._id
          ? { ...assignment, ...updatedCandidate } // merge updated data
          : assignment
      );
      setAssignments(updatedAssignments);
      toast({
        title: "Success",
        description: "Candidate data refreshed successfully",
      });
    } catch (error) {
      console.error("Failed to refetch candidate:", error);
      toast({
        title: "Error",
        description: "Failed to refresh candidate data. Please try again.",
        variant: "destructive",
      });
    }
  };

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
          assignment: (assignment as Candidate).assignment || null,
          history: (assignment as Candidate).history || [],
          email: (assignment as Candidate).email || undefined,
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
        onDashboard={true}
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
