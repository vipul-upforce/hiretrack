import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Copy,
  Tag,
  Download,
  MapPin,
  Clock,
  Calendar,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { CandidateStatusBadge } from "../Utils/candidate-status-badge";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import { User as UserType } from "@/lib/features/users/usersApi";
import TagsDialog from "../Dialogs/tags-dialog";
import TagsList from "@/components/ui/tagsList";
import { useRef } from "react";

interface DetailsDialogHeaderProps {
  candidate: Candidate;
  handleCandidateInfoCopy: (info: string) => void;
  user: UserType | null;
  refetch: () => void;
  onAssignClick?: () => void;
}

export default function DetailsDialogHeader({
  candidate,
  handleCandidateInfoCopy,
  user,
  refetch,
  onAssignClick,
}: DetailsDialogHeaderProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handlePopoverContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDownloadCV = () => {
    if (candidate.resume?.url) {
      const link = document.createElement("a");
      link.href = candidate.resume.url;
      link.download = `${candidate.name}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleInterviewerClick = () => {
    if (onAssignClick) {
      onAssignClick();
    }
  };

  return (
    <div>
      {candidate.tags ? <TagsList candidate={candidate} /> : null}
      <div className="text-2xl font-semibold">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex gap-2 items-center">
              <span className="text-2xl font-semibold">{candidate.name}</span>
              {candidate.isDeleted ? (
                <Badge className={`bg-red-500`}>Archived</Badge>
              ) : null}
            </div>
            {candidate.email && (
              <div className="text-gray-500 font-thin text-sm flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center">
                  <Mail size={12} className="mr-1" />
                  {candidate.email}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-5 w-5"
                    onClick={() =>
                      handleCandidateInfoCopy(candidate.email || "")
                    }
                    title="Copy Email"
                  >
                    <Copy size={12} />
                    <span className="sr-only">Copy Email</span>
                  </Button>
                </div>
                {candidate.contact && (
                  <div className="flex items-center">
                    <Phone size={12} className="mr-1" />
                    {candidate.contact}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-5 w-5"
                      onClick={() =>
                        handleCandidateInfoCopy(candidate.contact || "")
                      }
                      title="Copy Contact Number"
                    >
                      <Copy size={12} />
                      <span className="sr-only">Copy Contact Number</span>
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {(user?.role === "admin" || user?.role === "hr") && (
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          title="Tags"
                          ref={triggerRef}
                        >
                          <Tag size={12} />
                          <span className="sr-only">Tags</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        onClick={handlePopoverContentClick}
                        className="p-0"
                      >
                        <TagsDialog
                          user={user}
                          candidate={candidate}
                          refetch={refetch}
                          onClose={() => {
                            triggerRef.current?.click();
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {candidate.resume?.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={handleDownloadCV}
                      title="Download CV"
                    >
                      <Download size={12} />
                      <span className="sr-only">Download CV</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
            {/* Location, Experience, and CTC on a separate line below email */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {candidate.location && (
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={12} />
                  {candidate.location}
                </span>
              )}
              {candidate.experience !== undefined && (
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  {candidate.experience} years exp.
                </span>
              )}
              {candidate.expectedCTC !== undefined &&
                candidate.expectedCTC !== null && (
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    ₹{candidate.expectedCTC.toLocaleString()} LPA
                  </span>
                )}
            </div>
          </div>

          <div className="flex items-start gap-4 pl-12">
            {/* Status and Job */}
            <div className="flex flex-col items-end">
              <div className="mr-0 mt-4">
                <CandidateStatusBadge status={candidate?.status} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 text-end mt-1 max-w-[200px]">
                {candidate?.jobId?.title}
              </p>

              {/* Interview Details */}
              {candidate?.assignment &&
                candidate.assignment.interviewerId &&
                typeof candidate.assignment.interviewerId === "object" &&
                candidate.assignment.interviewerId._id &&
                candidate.assignment.interviewerId.name && (
                  <div className="mt-2">
                    <div
                      className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 min-w-[250px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
                      onClick={handleInterviewerClick}
                      title="Click to edit assignment"
                    >
                      <div className="flex items-center gap-1 text-xs text-blue-900 dark:text-blue-100">
                        <User
                          size={12}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        <span className="font-medium truncate">
                          {candidate.assignment.interviewerId.name}
                        </span>
                        <span className="text-blue-700 dark:text-blue-300">
                          •
                        </span>
                        <Calendar
                          size={10}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        <span className="text-blue-700 dark:text-blue-300">
                          {formatDate(candidate?.assignment?.time)} •{" "}
                          {formatTime(candidate?.assignment?.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
