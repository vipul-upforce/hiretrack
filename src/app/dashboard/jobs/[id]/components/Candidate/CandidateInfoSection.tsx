// src/components/candidate/CandidateInfoSection.tsx
import { MapPin, Briefcase, Clock, IndianRupee } from "lucide-react";
import { Candidate } from "@/types/candidate";
import { Label } from "@/components/ui/label";

interface CandidateInfoSectionProps {
  candidate: Candidate;
  user: any;
  labelClass: string;
}

export const CandidateInfoSection = ({
  candidate,
  user,
  labelClass,
}: CandidateInfoSectionProps) => (
  <div className="grid grid-cols-2 gap-6">
    <div className="space-y-2">
      <Label className={labelClass}>Location</Label>
      <div className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        {candidate.location}
      </div>
    </div>
    <div className="space-y-2">
      <Label className={labelClass}>Experience</Label>
      <div className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Briefcase className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        {candidate.experience} years
      </div>
    </div>
    <div className="space-y-2">
      <Label className={labelClass}>Notice Period</Label>
      <div className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        {candidate.noticePeriod} days
      </div>
    </div>
    {user?.role !== "interviewer" && (
      <>
        <div className="space-y-2">
          <Label className={labelClass}>Current CTC</Label>
          <div className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <IndianRupee className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            {candidate.currentCTC} LPA
          </div>
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Expected CTC</Label>
          <div className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <IndianRupee className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            {candidate.expectedCTC} LPA
          </div>
        </div>
      </>
    )}
  </div>
);
