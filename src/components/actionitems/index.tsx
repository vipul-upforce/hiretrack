import { useEffect, useState } from "react";
import { CandidateCard } from "@/app/dashboard/jobs/[id]/components/Candidate/candidate-card";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { Assignment } from "@/app/dashboard/page";
import { Candidate, CandidateStatus, Remark } from "@/types/candidate";
import { toast } from "@/hooks/use-toast";
import { useFetchCandidateByIdQuery, useRefetchCandidateMutation } from "@/lib/features/candidate/candidateApi";

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

  const {
    data: fetchedCandidate,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchCandidateByIdQuery(candidate?._id || "", {
    skip: !candidate?._id, // don't run if no candidate ID
  });

  // Candidate-specific refetch function
  const [triggerRefetchCandidate] = useRefetchCandidateMutation();

  const refetchCandidate = async () => {
    if (!candidate?._id) return;
    try {
      const updatedCandidate = await triggerRefetchCandidate(candidate._id).unwrap();
      setCandidate(updatedCandidate);
      const updatedAssignments = assignments.map((assignment) =>
        assignment._id === updatedCandidate._id
          ? { ...assignment, ...updatedCandidate }
          : assignment
      );
      setAssignments(updatedAssignments);
      toast({
        title: "Success",
        description: "Candidate data refreshed successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          (typeof err === "object" && err !== null && "data" in err && typeof (err as any).data?.message === "string"
            ? (err as any).data.message
            : "Failed to refresh candidate data. Please try again."),
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
          relevantExperience: assignment.relevantExperience,
          skills: assignment.skills,
          expectedCTC: assignment.expectedCTC,
          contact: assignment.contact,
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
          tags: assignment.tags,
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
        onEditClick={(candidate) => {
          // Handle edit - could open edit dialog
          console.log("Edit candidate:", candidate);
        }}
        onAssignClick={(candidate) => {
          // Handle assign - could open assign dialog
          console.log("Assign candidate:", candidate);
        }}
        onMarkAsDoneClick={(candidate) => {
          // Handle mark as done
          console.log("Mark as done:", candidate);
        }}
        onFollowUpClick={(candidate) => {
          // Handle follow up
          console.log("Follow up:", candidate);
        }}
        onAddRemarkClick={(candidate) => {
          // Handle add remark
          console.log("Add remark:", candidate);
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
