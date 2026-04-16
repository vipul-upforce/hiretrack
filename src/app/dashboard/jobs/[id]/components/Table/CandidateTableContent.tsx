'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Candidate } from '@/types/candidate';
import { Badge } from '@/components/ui/badge';
import { Star, TriangleAlert, CalendarClock, Flag, Trash2 } from 'lucide-react';
import { CandidateDetailsActionsMenu } from '../Candidate/CandidateDetailsActionsMenu';
import { useAppSelector } from '@/lib/redux/hooks';
import { format } from 'date-fns';
import { GridCircularScores } from '../Utils/circular-score';
import { useContext, useMemo } from 'react';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { CandidateActionType } from '@/components/unified-candidate-dialog/types';

interface CandidateTableContentProps {
  candidates: Candidate[];
  isLoading: boolean;
  visibleColumns: Record<string, boolean>;
  onCandidateClick: (caidate: Candidate) => void;
  onActionClick: (candidate: Candidate, action: CandidateActionType) => void;
  onEditClick: (candidate: Candidate) => void;
  onArchiveClick: (candidateId: string) => void;
  onDownloadCV: (candidate: Candidate) => void;
  onDownloadProfile: (candidate: Candidate) => void;
  onOpenDuplicateDialog: (candidate: Candidate) => void;
}

export function CandidateTableContent({
  candidates,
  isLoading,
  visibleColumns,
  onCandidateClick,
  onActionClick,
  onEditClick,
  onArchiveClick,
  onDownloadCV,
  onDownloadProfile,
  onOpenDuplicateDialog,
}: CandidateTableContentProps) {
  const { user } = useAppSelector((state) => state.auth || {});
  const { customFields } = useContext(CustomFieldsContext);
  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr';

  const jobPositionFormFields = useMemo(() => {
    if (!customFields) return [];
    const jobPositionForm = Object.entries(customFields).find(
      ([_, form]) => form.formName.toLowerCase() === 'job position',
    );
    return jobPositionForm ? jobPositionForm[1].fields || [] : [];
  }, [customFields]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'applied') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none capitalize text-[10px] h-5">{status}</Badge>;
    if (s === 'rejected' || s === 'reject') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none capitalize text-[10px] h-5">{status}</Badge>;
    if (s === 'accepted' || s === 'shortlisted' || s === 'shortlist') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none capitalize text-[10px] h-5">{status}</Badge>;
    return <Badge variant="secondary" className="capitalize text-[10px] h-5">{status}</Badge>;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black scrollbar-thin">
        <Table>
          <TableHeader className="sticky top-0 bg-white dark:bg-black z-20 shadow-sm">
            <TableRow className="hover:bg-transparent border-b">
              {visibleColumns.name && <TableHead className="w-[280px] font-bold">Candidate Details</TableHead>}
              {visibleColumns.status && <TableHead className="w-[140px] font-bold">Status</TableHead>}
              {visibleColumns.location && <TableHead className="w-[140px] font-bold">Location</TableHead>}
              {visibleColumns.appliedDate && <TableHead className="w-[120px] font-bold">Applied</TableHead>}
              {visibleColumns.followUp && <TableHead className="w-[180px] font-bold">Follow Up</TableHead>}
              {visibleColumns.skills && <TableHead className="min-w-[150px] font-bold">Skills</TableHead>}
              {visibleColumns.currentCTC && <TableHead className="font-bold">Current CTC</TableHead>}
              {visibleColumns.expectedCTC && <TableHead className="font-bold">Expected CTC</TableHead>}
              {visibleColumns.noticePeriod && <TableHead className="font-bold">Notice</TableHead>}
              {visibleColumns.aiScore && <TableHead className="w-[240px] font-bold text-center">AI Scores</TableHead>}

              {jobPositionFormFields.map((field) =>
                visibleColumns[field.id] && (
                  <TableHead key={field.id} className="font-bold">{field.label}</TableHead>
                )
              )}
              <TableHead className="text-right sticky right-0 bg-white dark:bg-black z-20 w-[80px] font-bold pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={25} className="h-32 text-center text-muted-foreground whitespace-nowrap">
                  {isLoading ? 'Searching candidates...' : 'No candidates match your criteria.'}
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <TableRow
                  key={candidate._id}
                  className="group hover:bg-muted/30 transition-colors cursor-pointer border-b"
                  onClick={() => onCandidateClick(candidate)}
                >
                  {visibleColumns.name && (
                    <TableCell>
                      <div className="flex gap-2.5 items-start">
                        <div className="flex flex-col gap-1 mt-1 shrink-0">
                          {candidate.scores?.overall !== undefined && candidate.scores?.overall !== null && (
                            <>
                              {candidate.scores.overall >= 8 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">High-scoring candidate</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {candidate.scores.redFlags && candidate.scores.redFlags.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Flag className="h-4 w-4 fill-red-500 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Low-scoring candidate</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-600 hover:underline truncate">
                              {candidate.name}
                            </span>
                            {candidate.isDeleted && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center text-red-600">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Archived</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {(candidate.duplicateCount ?? 0) > 1 && (
                              <TooltipProvider>
                                <Tooltip delayDuration={0}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex items-center gap-1 text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDuplicateDialog(candidate);
                                      }}
                                    >
                                      <TriangleAlert className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Multiple applications identified.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate opacity-80">{candidate.email}</span>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell>
                      {getStatusBadge(candidate.status)}
                    </TableCell>
                  )}
                  {visibleColumns.location && (
                    <TableCell>
                      {candidate.location}
                    </TableCell>
                  )}
                  {visibleColumns.appliedDate && (
                    <TableCell className="text-[13px] whitespace-nowrap">
                      {candidate.tracking?.createdAt
                        ? format(new Date(candidate.tracking.createdAt), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                  )}
                  {/* Follow Up UI */}
                  {visibleColumns.followUp && (
                    <TableCell>
                      {candidate?.followUp?.date || candidate?.followUp?.note ? (
                        <div className="flex flex-col gap-1">
                          {candidate.followUp.date && (
                            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                              <CalendarClock className="h-3.5 w-3.5" />
                              <span className="text-[11px] font-bold">
                                {new Date(candidate.followUp.date).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {candidate.followUp.note && (
                            <span className="text-[12px] text-muted-foreground truncate max-w-[250px] ">
                              {candidate.followUp.note}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-center text-muted-foreground opacity-50">-</span>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.skills && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {candidate.skills.slice(0, 4).map(skill => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[10px] h-5 py-0 px-2 font-medium text-nowrap"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 4 && (
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5 py-0 px-1.5 font-normal bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-default"
                                >
                                  +{candidate.skills.length - 4}
                                </Badge>
                              </TooltipTrigger>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.currentCTC && (
                    <TableCell className="text-[13px] whitespace-nowrap text-muted-foreground">
                      {candidate.currentCTC ? `${candidate.currentCTC.toLocaleString()} LPA` : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.expectedCTC && (
                    <TableCell className="text-[13px] whitespace-nowrap text-muted-foreground">
                      {candidate.expectedCTC ? `${candidate.expectedCTC.toLocaleString()} LPA` : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.noticePeriod && (
                    <TableCell className="text-[13px] text-muted-foreground">
                      {candidate.noticePeriod ? `${candidate.noticePeriod}d` : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.aiScore && (
                    <TableCell className="text-center ">
                      <GridCircularScores scores={candidate.scores || {}} size='vxs' />
                    </TableCell>
                  )}


                  {jobPositionFormFields.map((field) =>
                    visibleColumns[field.id] && (
                      <TableCell key={field.id} className="text-[13px] text-muted-foreground">
                        {candidate.customFields?.[field.id]?.toString() || '-'}
                      </TableCell>
                    )
                  )}

                  <TableCell className="text-right sticky right-0 bg-white dark:bg-black group-hover:bg-muted/10 transition-colors z-10 cursor-default pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      <CandidateDetailsActionsMenu
                        candidate={candidate}
                        isAdminOrHr={isAdminOrHr}
                        onOpenUnifiedAction={(action) => onActionClick(candidate, action)}
                        onEditClick={() => onEditClick(candidate)}
                        onArchiveClick={onArchiveClick}
                        onDownloadProfile={() => onDownloadProfile(candidate)}
                        onDownloadCV={() => onDownloadCV(candidate)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
