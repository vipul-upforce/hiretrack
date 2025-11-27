"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Candidate } from "@/types/candidate";
import { useToast } from "@/hooks/use-toast";
import { ShareCandidateFieldSelector } from "./share-candidate-components/ShareCandidateFieldSelector";
import { ShareCandidateDialogFooter } from "./share-candidate-components/ShareCandidateDialogFooter";

interface ShareCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate;
}

export interface ShareFieldsSelection {
  // Basic Information
  name: boolean;
  email: boolean;
  phone: boolean;
  location: boolean;

  // Professional Information
  experience: boolean;
  relevantExperience: boolean;
  skills: boolean;
  currentCTC: boolean;
  expectedCTC: boolean;
  noticePeriod: boolean;

  // AI Evaluation
  overallScore: boolean;
  experienceScore: boolean;
  skillsScore: boolean;
  affordability: boolean;
  strengths: boolean;
  areasForImprovement: boolean;
  recommendation: boolean;
  notes: boolean;

  // Job & Status
  jobDetails: boolean;
  status: boolean;

  // Assignment & Follow-up
  assignment: boolean;
  followUp: boolean;

  // Others
  tags: boolean;
  customFields: boolean;
  resume: boolean;
}


export function ShareCandidateDialog({
  open,
  onOpenChange,
  candidate,
}: ShareCandidateDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [selection, setSelection] = useState<ShareFieldsSelection>({
    // Basic - default selected
    name: true,
    email: true,
    phone: true,
    location: true,

    // Professional - default selected
    experience: true,
    relevantExperience: true,
    skills: true,

    currentCTC: true,
    expectedCTC: true,
    noticePeriod: true,

    // AI Evaluation - default selected
    overallScore: true,
    experienceScore: true,
    skillsScore: true,
    strengths: true,
    affordability: true,
    areasForImprovement: true,
    recommendation: true,
    notes: true,

    // Job & Status
    jobDetails: true,
    status: true,

    // Assignment & Follow-up
    assignment: false,
    followUp: false,

    // Others
    tags: false,
    customFields: false,
    resume: true,
  });

  const toggleField = useCallback(
    (field: keyof ShareFieldsSelection, value?: boolean) => {
      setSelection((prev) => ({
        ...prev,
        [field]: value !== undefined ? value : !prev[field],
      }));
    },
    []
  );

  const selectAllInCategory = useCallback(
    (category: "basic" | "professional" | "ai" | "job" | "additional") => {
      const updates: Partial<ShareFieldsSelection> = {};

      if (category === "basic") {
        updates.name = true;
        updates.email = true;
        updates.phone = true;
        updates.location = true;
      } else if (category === "professional") {
        updates.experience = true;
        updates.relevantExperience = true;
        updates.skills = true;
        updates.currentCTC = true;
        updates.expectedCTC = true;
        updates.noticePeriod = true;
      } else if (category === "ai") {
        updates.overallScore = true;
        updates.experienceScore = true;
        updates.skillsScore = true;
        updates.affordability = true;
        updates.strengths = true;
        updates.areasForImprovement = true;
        updates.recommendation = true;
        updates.notes = true;
      } else if (category === "job") {
        updates.jobDetails = true;
        updates.status = true;
      } else if (category === "additional") {
        updates.assignment = true;
        updates.followUp = true;
        updates.tags = true;
        updates.customFields = true;
      }

      setSelection((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const deselectAllInCategory = useCallback(
    (category: "basic" | "professional" | "ai" | "job" | "additional") => {
      const updates: Partial<ShareFieldsSelection> = {};

      if (category === "basic") {
        updates.name = false;
        updates.email = false;
        updates.phone = false;
        updates.location = false;
      } else if (category === "professional") {
        updates.experience = false;
        updates.relevantExperience = false;
        updates.skills = false;
        updates.currentCTC = false;
        updates.expectedCTC = false;
        updates.noticePeriod = false;
      } else if (category === "ai") {
        updates.overallScore = false;
        updates.experienceScore = false;
        updates.skillsScore = false;
        updates.affordability = false;
        updates.strengths = false;
        updates.areasForImprovement = false;
        updates.recommendation = false;
        updates.notes = false;
      } else if (category === "job") {
        updates.jobDetails = false;
        updates.status = false;
      } else if (category === "additional") {
        updates.assignment = false;
        updates.followUp = false;
        updates.tags = false;
        updates.customFields = false;
      }

      setSelection((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleGeneratePDF = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/candidates/share-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId: candidate._id,
          selection,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Use candidate name if selected, otherwise use generic filename
      link.download = selection.name
        ? `${candidate.name.replace(/\s+/g, "_")}_Profile.pdf`
        : "Candidate_Profile.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Candidate profile PDF generated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCount = useMemo(
    () => Object.values(selection).filter(Boolean).length,
    [selection]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="overflow-hidden flex flex-col justify-start"
      >
        <DialogHeader>
          <DialogTitle>
            Download Candidate Profile - {candidate.name}
          </DialogTitle>
          <DialogDescription>
            Customize and export the profile as a PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ShareCandidateFieldSelector
            candidate={candidate}
            selection={selection}
            toggleField={toggleField}
            selectAllInCategory={selectAllInCategory}
            deselectAllInCategory={deselectAllInCategory}
            selectedCount={selectedCount}
          />
        </div>

        <ShareCandidateDialogFooter
          isGenerating={isGenerating}
          selectedCount={selectedCount}
          onCancel={() => onOpenChange(false)}
          onGeneratePDF={handleGeneratePDF}
        />
      </DialogContent>
    </Dialog>
  );
}
