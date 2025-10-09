"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Candidate } from "@/types/candidate";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Share2,
  Download,
  Loader2,
  FileText,
  User,
  Briefcase,
  Brain,
  Settings,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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

// Memoized CheckboxField component
const CheckboxField = memo(({
  id,
  label,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center space-x-2 py-1.5">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
    <Label
      htmlFor={id}
      className={cn(
        "text-sm font-normal cursor-pointer flex-1",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {label}
    </Label>
  </div>
));

CheckboxField.displayName = "CheckboxField";

// Category Card component (needs to be inside to access callbacks, but memoized)
interface CategoryCardProps {
  title: string;
  icon: any;
  category: "basic" | "professional" | "ai" | "job" | "additional";
  children: React.ReactNode;
  onSelectAll: (category: "basic" | "professional" | "ai" | "job" | "additional") => void;
  onDeselectAll: (category: "basic" | "professional" | "ai" | "job" | "additional") => void;
}

const CategoryCard = memo(({
  title,
  icon: Icon,
  category,
  children,
  onSelectAll,
  onDeselectAll,
}: CategoryCardProps) => (
  <Card className="border-muted">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onSelectAll(category)}
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onDeselectAll(category)}
          >
            None
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4">{children}</div>
    </CardContent>
  </Card>
));

CategoryCard.displayName = "CategoryCard";

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

  const toggleField = useCallback((field: keyof ShareFieldsSelection, value?: boolean) => {
    setSelection((prev) => ({
      ...prev,
      [field]: value !== undefined ? value : !prev[field],
    }));
  }, []);

  const selectAllInCategory = useCallback((category: "basic" | "professional" | "ai" | "job" | "additional") => {
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
  }, []);

  const deselectAllInCategory = useCallback((category: "basic" | "professional" | "ai" | "job" | "additional") => {
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
  }, []);

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

  const selectedCount = useMemo(() => Object.values(selection).filter(Boolean).length, [selection]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Download Candidate Profile</DialogTitle>
              <DialogDescription className="mt-1">
                Customize and export <strong>{candidate.name}</strong>'s profile as a PDF
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {selectedCount} field{selectedCount !== 1 ? "s" : ""} selected
              </Badge>
              {selection.resume && candidate.resume?.url && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  CV will be included
                </Badge>
              )}
            </div>
          </div>

          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-4">
              {/* Basic Information */}
              <CategoryCard
                title="Basic Information"
                icon={User}
                category="basic"
                onSelectAll={selectAllInCategory}
                onDeselectAll={deselectAllInCategory}
              >
                <CheckboxField
                  id="name"
                  label="Name"
                  checked={selection.name}
                  onCheckedChange={(checked) => toggleField('name', checked as boolean)}
                />
                <CheckboxField
                  id="email"
                  label="Email"
                  checked={selection.email}
                  onCheckedChange={(checked) => toggleField('email', checked as boolean)}
                />
                <CheckboxField
                  id="phone"
                  label="Phone"
                  checked={selection.phone}
                  onCheckedChange={(checked) => toggleField('phone', checked as boolean)}
                />
                <CheckboxField
                  id="location"
                  label="Location"
                  checked={selection.location}
                  onCheckedChange={(checked) => toggleField('location', checked as boolean)}
                />
              </CategoryCard>

              {/* Professional Information */}
              <CategoryCard
                title="Professional Information"
                icon={Briefcase}
                category="professional"
                onSelectAll={selectAllInCategory}
                onDeselectAll={deselectAllInCategory}
              >
                <CheckboxField
                  id="experience"
                  label="Total Experience"
                  checked={selection.experience}
                  onCheckedChange={(checked) => toggleField('experience', checked as boolean)}
                />
                <CheckboxField
                  id="relevantExperience"
                  label="Relevant Experience"
                  checked={selection.relevantExperience}
                  onCheckedChange={(checked) => toggleField('relevantExperience', checked as boolean)}
                />
                <CheckboxField
                  id="skills"
                  label="Skills"
                  checked={selection.skills}
                  onCheckedChange={(checked) => toggleField('skills', checked as boolean)}
                />
                <CheckboxField
                  id="currentCTC"
                  label="Current CTC"
                  checked={selection.currentCTC}
                  onCheckedChange={(checked) => toggleField('currentCTC', checked as boolean)}
                />
                <CheckboxField
                  id="expectedCTC"
                  label="Expected CTC"
                  checked={selection.expectedCTC}
                  onCheckedChange={(checked) => toggleField('expectedCTC', checked as boolean)}
                />
                <CheckboxField
                  id="noticePeriod"
                  label="Notice Period"
                  checked={selection.noticePeriod}
                  onCheckedChange={(checked) => toggleField('noticePeriod', checked as boolean)}
                />
              </CategoryCard>

              {/* AI Evaluation */}
              {candidate.scores && (
                <CategoryCard
                  title="AI Evaluation"
                  icon={Brain}
                  category="ai"
                  onSelectAll={selectAllInCategory}
                  onDeselectAll={deselectAllInCategory}
                >
                  <CheckboxField
                    id="overallScore"
                    label="Overall Score"
                    checked={selection.overallScore}
                    onCheckedChange={(checked) => toggleField('overallScore', checked as boolean)}
                  />
                  <CheckboxField
                    id="experienceScore"
                    label="Experience Score"
                    checked={selection.experienceScore}
                    onCheckedChange={(checked) => toggleField('experienceScore', checked as boolean)}
                  />
                  <CheckboxField
                    id="skillsScore"
                    label="Skills Score"
                    checked={selection.skillsScore}
                    onCheckedChange={(checked) => toggleField('skillsScore', checked as boolean)}
                  />
                  <CheckboxField
                    id="strengths"
                    label="Strengths"
                    checked={selection.strengths}
                    onCheckedChange={(checked) => toggleField('strengths', checked as boolean)}
                  />
                  <CheckboxField
                    id="areasForImprovement"
                    label="Areas for Improvement"
                    checked={selection.areasForImprovement}
                    onCheckedChange={(checked) => toggleField('areasForImprovement', checked as boolean)}
                  />
                  <CheckboxField
                    id="recommendation"
                    label="Recommendation"
                    checked={selection.recommendation}
                    onCheckedChange={(checked) => toggleField('recommendation', checked as boolean)}
                  />
                  <CheckboxField
                    id="notes"
                    label="AI Notes"
                    checked={selection.notes}
                    onCheckedChange={(checked) => toggleField('notes', checked as boolean)}
                  />
                </CategoryCard>
              )}

              {/* Job & Status */}
              <CategoryCard
                title="Job & Status"
                icon={Briefcase}
                category="job"
                onSelectAll={selectAllInCategory}
                onDeselectAll={deselectAllInCategory}
              >
                <CheckboxField
                  id="jobDetails"
                  label="Job Details"
                  checked={selection.jobDetails}
                  onCheckedChange={(checked) => toggleField('jobDetails', checked as boolean)}
                />
                <CheckboxField
                  id="status"
                  label="Application Status"
                  checked={selection.status}
                  onCheckedChange={(checked) => toggleField('status', checked as boolean)}
                />
              </CategoryCard>

              {/* Additional Information */}
              <CategoryCard
                title="Additional Information"
                icon={Settings}
                category="additional"
                onSelectAll={selectAllInCategory}
                onDeselectAll={deselectAllInCategory}
              >
                {candidate.assignment && (
                  <CheckboxField
                    id="assignment"
                    label="Interview Assignment"
                    checked={selection.assignment}
                    onCheckedChange={(checked) => toggleField('assignment', checked as boolean)}
                  />
                )}
                {candidate.followUp && (
                  <CheckboxField
                    id="followUp"
                    label="Follow-up Notes"
                    checked={selection.followUp}
                    onCheckedChange={(checked) => toggleField('followUp', checked as boolean)}
                  />
                )}
                {candidate.tags && candidate.tags.length > 0 && (
                  <CheckboxField
                    id="tags"
                    label="Tags"
                    checked={selection.tags}
                    onCheckedChange={(checked) => toggleField('tags', checked as boolean)}
                  />
                )}
                {candidate.customFields &&
                  Object.keys(candidate.customFields).length > 0 && (
                    <CheckboxField
                      id="customFields"
                      label="Custom Fields"
                      checked={selection.customFields}
                      onCheckedChange={(checked) => toggleField('customFields', checked as boolean)}
                    />
                  )}
              </CategoryCard>

              {/* Resume */}
              {candidate.resume?.url && (
                <Card className="border-muted bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm">Resume/CV</h3>
                          <Checkbox
                            id="resume"
                            checked={selection.resume}
                            onCheckedChange={(checked) => toggleField('resume', checked === true)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The candidate's resume will be merged at the end of the profile PDF
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || selectedCount === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
