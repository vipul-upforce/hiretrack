'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Copy,
  Tag,
  Download,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Briefcase,
  IndianRupee,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import TagsList from '@/components/ui/tagsList';
import React, { useRef, useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { useAppSelector } from '@/lib/redux/hooks';
import TagsDialog from '../Dialogs/tags-dialog';
import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';
import { CandidateStatusBadge } from '../Utils/candidate-status-badge';
import { ShareCandidateDialog } from '../Dialogs/share-candidate-dialog';

interface DetailsDialogHeaderProps {
  candidate: Candidate;
  handleCandidateInfoCopy: (info: string) => void;
  refetch: () => void;
  onAssignClick?: () => void;
}

export default function DetailsDialogHeader({
  candidate,
  handleCandidateInfoCopy,
  refetch,
  onAssignClick,
}: DetailsDialogHeaderProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const { userRole: role } = useAuth();
  const handlePopoverContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const { user } = useAppSelector((state) => state.auth);

  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr';

  const handleDownloadCV = () => {
    if (candidate.resume?.url) {
      const link = document.createElement('a');
      link.href = candidate.resume.url;
      link.download = `${candidate.name}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleJobRedirect = () => {
    // if user's role is neither admin nor hr then dont redirect.
    if (!isAdminOrHr) return;

    const jobUrl = `/dashboard/jobs/${candidate.jobId._id}`;

    // avoid redirect if already on same page
    if (pathname === jobUrl) return;

    router.push(jobUrl);
  };

  const handleInterviewerClick = () => {
    if (!isAdminOrHr) {
      return;
    }
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
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{candidate.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-5 w-5"
                onClick={() => handleCandidateInfoCopy(candidate.name || '')}
                title="Copy Name"
              >
                <Copy size={12} />
                <span className="sr-only">Copy Name</span>
              </Button>
              {candidate.isDeleted ? (
                <Badge className="bg-red-500">Archived</Badge>
              ) : null}
            </div>
            {candidate.email && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-thin text-gray-500">
                <div className="flex items-center">
                  <Mail size={12} className="mr-1" />
                  {candidate.email}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-5 w-5"
                    onClick={() =>
                      handleCandidateInfoCopy(candidate.email || '')
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
                        handleCandidateInfoCopy(candidate.contact || '')
                      }
                      title="Copy Contact Number"
                    >
                      <Copy size={12} />
                      <span className="sr-only">Copy Contact Number</span>
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {isAdminOrHr && (
                    <Popover modal>
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
                  {isAdminOrHr && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setIsDownloadDialogOpen(true)}
                      title="Download Profile"
                    >
                      <FileDown size={12} />
                      <span className="sr-only">Download Profile</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
            {/* Location, Experience, and CTC on a separate line below email */}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {candidate.location && (
                <span className="flex items-center gap-1 text-sm font-normal text-gray-600 dark:text-gray-400">
                  <MapPin size={12} />
                  {candidate.location}
                </span>
              )}
              {(candidate.relevantExperience !== undefined ||
                candidate.experience !== undefined) && (
                <span className="flex items-center gap-1 text-sm font-normal text-gray-600 dark:text-gray-400">
                  <Briefcase size={12} />
                  Exp:{' '}
                  {candidate.relevantExperience !== undefined &&
                    `${candidate.relevantExperience}y Rel`}
                  {candidate.relevantExperience !== undefined &&
                    candidate.experience !== undefined &&
                    ', '}
                  {candidate.experience !== undefined &&
                    `${candidate.experience}y Total`}
                </span>
              )}
              {candidate.noticePeriod !== undefined && (
                <span className="flex items-center gap-1 text-sm font-normal text-gray-600 dark:text-gray-400">
                  <AlertCircle size={12} />
                  Notice: {candidate.noticePeriod}d
                </span>
              )}
              {((candidate.currentCTC !== undefined &&
                candidate.currentCTC !== null) ||
                (candidate.expectedCTC !== undefined &&
                  candidate.expectedCTC !== null)) &&
                role !== 'interviewer' && (
                  <span className="flex items-center gap-1 text-sm font-normal text-gray-600 dark:text-gray-400">
                    <IndianRupee size={12} />
                    Salary:{' '}
                    {candidate.currentCTC !== undefined &&
                      candidate.currentCTC !== null &&
                      `${candidate.currentCTC}L Cur`}
                    {candidate.currentCTC !== undefined &&
                      candidate.currentCTC !== null &&
                      candidate.expectedCTC !== undefined &&
                      candidate.expectedCTC !== null &&
                      ', '}
                    {candidate.expectedCTC !== undefined &&
                      candidate.expectedCTC !== null &&
                      `${candidate.expectedCTC}L Exp`}
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
              {isAdminOrHr ? (
                <button
                  type="button"
                  onClick={handleJobRedirect}
                  disabled={!isAdminOrHr}
                  className="mt-1 max-w-[300px] cursor-pointer truncate text-end text-xs text-gray-500 hover:underline"
                >
                  {candidate?.jobId?.title}
                </button>
              ) : (
                <span className="mt-1 max-w-[300px] truncate text-end text-xs text-gray-400">
                  {candidate?.jobId?.title}
                </span>
              )}

              {/* Interview Details */}
              {candidate?.assignment &&
                candidate.assignment.interviewerId &&
                typeof candidate.assignment.interviewerId === 'object' &&
                candidate.assignment.interviewerId._id &&
                candidate.assignment.interviewerId.name && (
                  <div className="mt-2">
                    <button
                      type="button"
                      role={isAdminOrHr ? 'button' : undefined}
                      tabIndex={isAdminOrHr ? 0 : undefined}
                      className={`min-w-[250px] rounded border border-blue-200 bg-blue-50 px-2 py-1 dark:border-blue-800 dark:bg-blue-900/20 ${
                        isAdminOrHr
                          ? 'cursor-pointer transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'cursor-default'
                      }`}
                      onClick={isAdminOrHr ? handleInterviewerClick : undefined}
                      title={
                        isAdminOrHr ? 'Click to edit assignment' : undefined
                      }
                    >
                      <div className="flex items-center gap-1 text-xs text-blue-900 dark:text-blue-100">
                        <User
                          size={12}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        <span className="truncate font-medium">
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
                          {formatDate(candidate?.assignment?.time)} •{' '}
                          {formatTime(candidate?.assignment?.time)}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Download Profile Dialog */}
      <ShareCandidateDialog
        open={isDownloadDialogOpen}
        onOpenChange={setIsDownloadDialogOpen}
        candidate={candidate}
      />
    </div>
  );
}
