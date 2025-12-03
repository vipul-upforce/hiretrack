/**
 * Share Candidate Field Selector Component
 * Displays all field selection categories with checkboxes
 */

import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Briefcase, Brain, Settings, CheckCircle2 } from "lucide-react";
import { Candidate } from "@/types/candidate";
import { cn } from "@/lib/utils";
import { ShareFieldsSelection } from "../share-candidate-dialog";

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CheckboxField = memo(
  ({ id, label, checked, onCheckedChange, disabled = false }: CheckboxFieldProps) => (
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
  )
);

CheckboxField.displayName = "CheckboxField";

interface CategoryCardProps {
  title: string;
  icon: any;
  category: "basic" | "professional" | "ai" | "job" | "additional";
  children: React.ReactNode;
  onSelectAll: (
    category: "basic" | "professional" | "ai" | "job" | "additional"
  ) => void;
  onDeselectAll: (
    category: "basic" | "professional" | "ai" | "job" | "additional"
  ) => void;
}

const CategoryCard = memo(
  ({
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
  )
);

CategoryCard.displayName = "CategoryCard";

interface ShareCandidateFieldSelectorProps {
  candidate: Candidate;
  selection: ShareFieldsSelection;
  toggleField: (field: keyof ShareFieldsSelection, value?: boolean) => void;
  selectAllInCategory: (
    category: "basic" | "professional" | "ai" | "job" | "additional"
  ) => void;
  deselectAllInCategory: (
    category: "basic" | "professional" | "ai" | "job" | "additional"
  ) => void;
  selectedCount: number;
}

export function ShareCandidateFieldSelector({
  candidate,
  selection,
  toggleField,
  selectAllInCategory,
  deselectAllInCategory,
  selectedCount,
}: ShareCandidateFieldSelectorProps) {
  return (
    <>
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

      <div className="space-y-4">
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
              onCheckedChange={(checked) =>
                toggleField("name", checked as boolean)
              }
            />
            <CheckboxField
              id="email"
              label="Email"
              checked={selection.email}
              onCheckedChange={(checked) =>
                toggleField("email", checked as boolean)
              }
            />
            <CheckboxField
              id="phone"
              label="Phone"
              checked={selection.phone}
              onCheckedChange={(checked) =>
                toggleField("phone", checked as boolean)
              }
            />
            <CheckboxField
              id="location"
              label="Location"
              checked={selection.location}
              onCheckedChange={(checked) =>
                toggleField("location", checked as boolean)
              }
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
              onCheckedChange={(checked) =>
                toggleField("experience", checked as boolean)
              }
            />
            <CheckboxField
              id="relevantExperience"
              label="Relevant Experience"
              checked={selection.relevantExperience}
              onCheckedChange={(checked) =>
                toggleField("relevantExperience", checked as boolean)
              }
            />
            <CheckboxField
              id="skills"
              label="Skills"
              checked={selection.skills}
              onCheckedChange={(checked) =>
                toggleField("skills", checked as boolean)
              }
            />
            <CheckboxField
              id="currentCTC"
              label="Current CTC"
              checked={selection.currentCTC}
              onCheckedChange={(checked) =>
                toggleField("currentCTC", checked as boolean)
              }
            />
            <CheckboxField
              id="expectedCTC"
              label="Expected CTC"
              checked={selection.expectedCTC}
              onCheckedChange={(checked) =>
                toggleField("expectedCTC", checked as boolean)
              }
            />
            <CheckboxField
              id="noticePeriod"
              label="Notice Period"
              checked={selection.noticePeriod}
              onCheckedChange={(checked) =>
                toggleField("noticePeriod", checked as boolean)
              }
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
                onCheckedChange={(checked) =>
                  toggleField("overallScore", checked as boolean)
                }
              />
              <CheckboxField
                id="experienceScore"
                label="Experience Score"
                checked={selection.experienceScore}
                onCheckedChange={(checked) =>
                  toggleField("experienceScore", checked as boolean)
                }
              />
              <CheckboxField
                id="skillsScore"
                label="Skills Score"
                checked={selection.skillsScore}
                onCheckedChange={(checked) =>
                  toggleField("skillsScore", checked as boolean)
                }
              />
              <CheckboxField
                id="affordability"
                label="Affordability"
                checked={selection.affordability}
                onCheckedChange={(checked) =>
                  toggleField("affordability", checked as boolean)
                }
              />
              <CheckboxField
                id="strengths"
                label="Strengths"
                checked={selection.strengths}
                onCheckedChange={(checked) =>
                  toggleField("strengths", checked as boolean)
                }
              />
              <CheckboxField
                id="areasForImprovement"
                label="Areas for Improvement"
                checked={selection.areasForImprovement}
                onCheckedChange={(checked) =>
                  toggleField("areasForImprovement", checked as boolean)
                }
              />
              <CheckboxField
                id="recommendation"
                label="Recommendation"
                checked={selection.recommendation}
                onCheckedChange={(checked) =>
                  toggleField("recommendation", checked as boolean)
                }
              />
              <CheckboxField
                id="notes"
                label="AI Notes"
                checked={selection.notes}
                onCheckedChange={(checked) =>
                  toggleField("notes", checked as boolean)
                }
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
              onCheckedChange={(checked) =>
                toggleField("jobDetails", checked as boolean)
              }
            />
            <CheckboxField
              id="status"
              label="Application Status"
              checked={selection.status}
              onCheckedChange={(checked) =>
                toggleField("status", checked as boolean)
              }
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
                onCheckedChange={(checked) =>
                  toggleField("assignment", checked as boolean)
                }
              />
            )}
            {candidate.followUp && (
              <CheckboxField
                id="followUp"
                label="Follow-up Notes"
                checked={selection.followUp}
                onCheckedChange={(checked) =>
                  toggleField("followUp", checked as boolean)
                }
              />
            )}
            {candidate.tags && candidate.tags.length > 0 && (
              <CheckboxField
                id="tags"
                label="Tags"
                checked={selection.tags}
                onCheckedChange={(checked) =>
                  toggleField("tags", checked as boolean)
                }
              />
            )}
            {candidate.customFields &&
              Object.keys(candidate.customFields).length > 0 && (
                <CheckboxField
                  id="customFields"
                  label="Custom Fields"
                  checked={selection.customFields}
                  onCheckedChange={(checked) =>
                    toggleField("customFields", checked as boolean)
                  }
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
                        onCheckedChange={(checked) =>
                          toggleField("resume", checked === true)
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The candidate's resume will be merged at the end of the
                      profile PDF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}



