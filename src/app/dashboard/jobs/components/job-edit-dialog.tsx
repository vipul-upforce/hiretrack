'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput } from "@/components/ui/chip-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Job } from "@/types/job";
import { useUpdateJobMutation } from "@/lib/features/job/jobApi";
import { useFetchInterviewersQuery } from "@/lib/features/user/userApi";
import { useState } from "react";
import { format } from "date-fns";
import { skillSuggestions } from "../../jobs-board/components/job-form";

interface JobEditDialogProps {
  job: Job;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobEditDialog({
  job,
  isOpen,
  onOpenChange,
}: JobEditDialogProps) {
  const [updateJob] = useUpdateJobMutation();
  const { data: interviewers } = useFetchInterviewersQuery();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(job.title);
  // const [company, setCompany] = useState(job.company);
  const [description, setDescription] = useState(job.description);
  const [skills, setSkills] = useState(job.skills);
  const [experience, setExperience] = useState(job.experience.toString());
  // const [validTill, setValidTill] = useState<Date>(new Date(job.validTill));
  const [selectedInterviewer, setSelectedInterviewer] = useState(job.assignment?.interviewerId || '');
  const [deadline, setDeadline] = useState<Date | undefined>(job.assignment?.deadline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedJob = {
        _id: job._id,
        title,
        // company,
        description,
        skills,
        experience: Number(experience),
        // validTill,
        assignment: selectedInterviewer && deadline ? {
          interviewerId: selectedInterviewer,
          assignedAt: new Date(),
          deadline,
        } : undefined,
      };

      await updateJob(updatedJob).unwrap();
      
      toast({
        title: "Success",
        description: "Job updated successfully",
      });
      
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience (years)</Label>
              <Input
                id="experience"
                type="number"
                step="0.01"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <ChipInput
              value={skills}
              onChange={setSkills}
              placeholder={`Enter skills`}
              onSuggestionClick={(suggestion) => {
                setSkills([
                  ...skills,
                  suggestion,
                ]);
              }}
              suggestions={skillSuggestions.filter(
                (skill) => !skills.includes(skill)
              ) || []}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Assignment Section */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-lg font-semibold">Assignment</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interviewer</Label>
                <Select
                  value={selectedInterviewer}
                  onValueChange={setSelectedInterviewer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">None</SelectItem>
                    {interviewers?.map((interviewer) => (
                      <SelectItem key={interviewer._id} value={interviewer._id}>
                        {interviewer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deadline</Label>
                <DatePicker
                  date={deadline}
                  onDateChange={setDeadline}
                  placeholder="Select deadline"
                />
              </div>
            </div>

            {job.assignment && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <Label className="text-sm text-muted-foreground">Current Assignment</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Assigned To: </span>
                    <span className="text-sm font-medium">
                      {interviewers?.find(i => i._id === job.assignment?.interviewerId)?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Deadline: </span>
                    <span className="text-sm font-medium">
                      {format(new Date(job.assignment.deadline), "PPP")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 