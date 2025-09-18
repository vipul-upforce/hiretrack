"use client";

import { Candidate } from "@/types/candidate";
import { useState, useEffect } from "react";
import AddRemarksDialog from "./add-remark-dialog";

interface GlobalRemarksDialogProps {
  openRemarksFor: string | null;
  setOpenRemarksFor: (candidateId: string | null) => void;
  candidates: Candidate[];
  refetch: () => void;
}

export const GlobalRemarksDialog = ({
  openRemarksFor,
  setOpenRemarksFor,
  candidates,
  refetch,
}: GlobalRemarksDialogProps) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // Find the candidate when openRemarksFor changes
  useEffect(() => {
    if (openRemarksFor) {
      const foundCandidate = candidates.find((c) => c._id === openRemarksFor);
      setCandidate(foundCandidate || null);
    } else {
      setCandidate(null);
    }
  }, [openRemarksFor, candidates]);

  if (!candidate) return null;

  return (
    <AddRemarksDialog
      candidate={candidate}
      isOpen={!!openRemarksFor}
      onOpenChange={(open) => {
        if (!open) setOpenRemarksFor(null);
      }}
      setOpenRemarksFor={setOpenRemarksFor}
      refetch={refetch}
    />
  );
};
