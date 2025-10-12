"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Info, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EvaluationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EvaluationSettings({ isOpen, onClose }: EvaluationSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.1);
  const [customPrompt, setCustomPrompt] = useState("");
  const [autoEvaluateAll, setAutoEvaluateAll] = useState(false);
  const [maxPdfPages, setMaxPdfPages] = useState(4);
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  const DEFAULT_PROMPT = `As a seasoned senior technology leader with expertise in talent acquisition, you are conducting a rigorous evaluation of a candidate.

Job Details:
- Job Title: {{JOB_TITLE}}
- Job Description: {{JOB_DESCRIPTION}}
- Required Experience: {{EXPERIENCE}}
- CTC Range: {{CTC_RANGE}}
- Job Salary: {{JOB_SALARY}}
- Required Skills: {{REQUIRED_SKILLS}}

Candidate Information:
- Current CTC: {{CANDIDATE_CURRENT_CTC}}
- Expected CTC: {{CANDIDATE_EXPECTED_CTC}}

EVALUATION SCORING SCALE (Be consistent with this scale):
1-3: Poor/Inadequate - Critical gaps, major mismatches
4-5: Below Average - Significant gaps, requires substantial development
6-7: Average/Satisfactory - Meets minimum requirements, some gaps
8-9: Good/Strong - Exceeds requirements, minor gaps only
10: Exceptional - Perfect match, exemplary in all aspects

Evaluation Criteria (Score independently and strictly):

1. SKILLS (1-10):
   - Match ONLY exact skills/technologies mentioned in job description with those in CV
   - Do NOT infer or assume skills not explicitly stated in CV
   - Score based on: breadth (how many required skills matched) + depth (proficiency level indicated)
   - Penalize for missing critical skills

2. EXPERIENCE (1-10):
   - Consider ONLY relevant work experience matching the job domain/industry
   - Evaluate: years of relevant experience + quality of past roles + project complexity
   - Total years matter less than relevant years
   - Junior roles in unrelated domains should not count heavily

3. AFFORDABILITY (1-10):
   - Compare candidate's expected CTC ({{CANDIDATE_EXPECTED_CTC}}) with job's CTC range ({{CTC_RANGE}} / {{JOB_SALARY}})
   - Scoring logic:
     * 8-10: Candidate expectation is below or at lower end of budget
     * 6-7: Candidate expectation is within mid-range of budget
     * 4-5: Candidate expectation is at upper end of budget
     * 1-3: Candidate expectation exceeds budget significantly
     * 0: If salary data is missing or not specified for either party
   - Consider value for money (skills + experience vs cost)

4. OVERALL (1-10):
   - Holistic assessment combining skills, experience, cultural fit indicators, and job description alignment
   - NOT a simple average - weigh based on role importance
   - Consider: Does this candidate solve the hiring problem?

Additional Output Fields:
- contact (string): Extract phone number/contact from CV. Return as string, not "Not found" if absent.
- strengths (array, max 4): List ONLY genuine strengths evident from CV with specific examples
- areas_for_improvement (array, max 4): List SPECIFIC gaps or weaknesses relative to job requirements
- recommendation (string): Must be one of: "Strongly Recommend" / "Recommend" / "Consider with Reservations" / "Not Recommended"
- notes (string): Concise observations justifying your scores. Mention key evidence from CV.

CRITICAL INSTRUCTIONS FOR CONSISTENCY:
- Use the scoring scale strictly - average candidates should get 5-7, not 8-9
- Score each dimension independently - avoid giving similar scores across all categories
- Base scores ONLY on evidence in CV - do not make charitable assumptions
- Be critical and objective - most candidates are average, not exceptional
- Provide specific evidence in notes to justify each score

Available placeholders:
{{JOB_TITLE}}, {{JOB_DESCRIPTION}}, {{EXPERIENCE}}, {{CTC_RANGE}}, {{JOB_SALARY}}, {{REQUIRED_SKILLS}}, {{CANDIDATE_CURRENT_CTC}}, {{CANDIDATE_EXPECTED_CTC}}`;

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/evaluation");
      if (response.ok) {
        const data = await response.json();
        const config = data.evaluationConfig;
        setTemperature(config.temperature || 0.1);
        setCustomPrompt(config.customPrompt || "");
        setAutoEvaluateAll(config.autoEvaluateAllCandidates || false);
        setMaxPdfPages(config.maxPdfPages || 4);
        setUseCustomPrompt(!!config.customPrompt);
      }
    } catch (error) {
      console.error("Failed to fetch evaluation settings:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/evaluation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature,
          customPrompt: useCustomPrompt ? customPrompt : null,
          autoEvaluateAllCandidates: autoEvaluateAll,
          maxPdfPages,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Evaluation settings updated successfully",
        });
        onClose();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    setTemperature(0.1);
    setCustomPrompt("");
    setAutoEvaluateAll(false);
    setMaxPdfPages(4);
    setUseCustomPrompt(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[min(1400px,95vw)] h-[90vh] p-0 flex flex-col overflow-hidden"
      >
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>AI Evaluation Settings</DialogTitle>
          <DialogDescription>
            Configure how candidates are automatically evaluated using AI
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Temperature Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">
                Temperature: {temperature.toFixed(2)}
              </Label>
              <span className="text-xs text-muted-foreground">
                {temperature === 0 ? "Fully Deterministic" : temperature <= 0.3 ? "High Consistency" : "More Creative"}
              </span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.05}
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower values (0-0.2) give consistent, deterministic scores. Recommended: 0.1 for 95% consistency.
            </p>
          </div>

          {/* Auto Evaluate Toggle */}
          <div className="flex items-center justify-between space-x-2 border-t pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="autoEval">Auto-evaluate all candidates</Label>
              <p className="text-sm text-muted-foreground">
                Ignore page limits and evaluate all PDF resumes automatically
              </p>
            </div>
            <Switch
              id="autoEval"
              checked={autoEvaluateAll}
              onCheckedChange={setAutoEvaluateAll}
            />
          </div>

          {/* Max PDF Pages */}
          {!autoEvaluateAll && (
            <div className="space-y-2">
              <Label htmlFor="maxPages">
                Max PDF Pages for Auto-Evaluation
              </Label>
              <Input
                id="maxPages"
                type="number"
                min={0}
                value={maxPdfPages}
                onChange={(e) => setMaxPdfPages(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Only PDFs with this many pages or fewer will be auto-evaluated. Set to 0 for no limit.
              </p>
            </div>
          )}

          {/* Custom Prompt Toggle */}
          <div className="flex items-center justify-between space-x-2 border-t pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="useCustom">Use custom evaluation prompt</Label>
              <p className="text-sm text-muted-foreground">
                Override the default prompt with your own criteria
              </p>
            </div>
            <Switch
              id="useCustom"
              checked={useCustomPrompt}
              onCheckedChange={setUseCustomPrompt}
            />
          </div>

          {/* Custom Prompt Editor */}
          {useCustomPrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customPrompt">Custom Evaluation Prompt</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomPrompt(DEFAULT_PROMPT)}
                  className="text-xs"
                >
                  Load Sample Prompt
                </Button>
              </div>
              <Textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={DEFAULT_PROMPT}
                rows={12}
                className="font-mono text-sm"
              />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Available placeholders:</strong> {"{"}{"{"} JOB_TITLE{"}"}{"}"}, {"{"}{"{"} JOB_DESCRIPTION{"}"}{"}"}, {"{"}{"{"} EXPERIENCE{"}"}{"}"}, {"{"}{"{"} CTC_RANGE{"}"}{"}"}, {"{"}{"{"} REQUIRED_SKILLS{"}"}{"}"}, {"{"}{"{"} JOB_SALARY{"}"}{"}"}, {"{"}{"{"} CANDIDATE_CURRENT_CTC{"}"}{"}"}, {"{"}{"{"} CANDIDATE_EXPECTED_CTC{"}"}{"}"}
                  <br />
                  <strong>Required JSON format:</strong> The prompt must ensure the AI returns a JSON with: overall, skills, experience, contact, affordability, strengths, areas_for_improvement, recommendation, notes
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Warning */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Changes will only apply to new evaluations. Existing candidate scores will not be affected. Manual re-evaluation will use these new settings.
            </AlertDescription>
          </Alert>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between border-t bg-background px-6 py-4 mt-auto">
          <Button variant="outline" onClick={resetToDefault} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
