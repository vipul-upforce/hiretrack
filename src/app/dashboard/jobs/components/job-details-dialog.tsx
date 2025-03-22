'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Job } from "@/types/job";
import { Briefcase, UserPlus } from "lucide-react";
// import { Building2, Briefcase, Calendar, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useFetchInterviewersQuery } from "@/lib/features/user/userApi";
import { useUpdateJobMutation } from "@/lib/features/job/jobApi";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

interface JobDetailsDialogProps {
  job: Job;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailsDialog({
  job,
  isOpen,
  onOpenChange,
}: JobDetailsDialogProps) {
  const { data: interviewers } = useFetchInterviewersQuery();
  const [updateJob] = useUpdateJobMutation();
  const { toast } = useToast();
  const [selectedInterviewer, setSelectedInterviewer] = useState(job.assignment?.interviewerId || '');
  const [deadline, setDeadline] = useState<Date | undefined>(job.assignment?.deadline);
  const [isExpanded, setIsExpanded] = useState(false);

  const labelClass = "text-sm text-muted-foreground";

  const handleAssign = async () => {
    if (!selectedInterviewer || !deadline) {
      toast({
        title: "Error",
        description: "Please select both interviewer and deadline",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateJob({
        _id: job._id,
        assignment: {
          interviewerId: selectedInterviewer,
          assignedAt: new Date(),
          deadline,
        },
      }).unwrap();

      toast({
        title: "Success",
        description: "Job assigned successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign job",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] max-h-[90vh] overflow-y-auto flex flex-col justify-start">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold">{job.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Job Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* <div className="space-y-2">
              <Label className={labelClass}>Company</Label>
              <div className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {job.company}
              </div>
            </div> */}

            {/* <div className="space-y-2">
              <Label className={labelClass}>Valid Till</Label>
              <div className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(job.validTill), "PPP")}
              </div>
            </div> */}

            <div className="space-y-2">
              <Label className={labelClass}>Experience</Label>
              <div className="text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {job.experience} years
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Status</Label>
              <div className="text-sm">
                <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                  {job.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label className={labelClass}>Skills Required</Label>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={labelClass}>Description</Label>
            <Button onClick={() => setIsExpanded(!isExpanded)} className="text-left">
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {isExpanded && (
              <div className="text-sm whitespace-pre-wrap">
                {job.description}
              </div>
            )}
          </div>

          {/* Assignment Section */}
          <div className="space-y-6 border-t pt-4">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Assign to Interviewer</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Interviewer</Label>
                  <Select
                    value={selectedInterviewer}
                    onValueChange={setSelectedInterviewer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent>
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

              <div className="flex justify-end">
                <Button onClick={handleAssign}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
            </div>

            {job.assignment && (
              <div className="space-y-2 bg-muted p-4 rounded-lg">
                <Label className="text-lg font-semibold">Current Assignment</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Assigned To</Label>
                    <div className="text-sm font-medium">
                      {interviewers?.find(i => i._id === job.assignment?.interviewerId)?.name}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Deadline</Label>
                    <div className="text-sm font-medium">
                      {format(new Date(job.assignment.deadline), "PPP")}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Assigned On</Label>
                    <div className="text-sm font-medium">
                      {format(new Date(job.assignment.assignedAt), "PPP")}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 