"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Search,
  Eye,
  ChevronLeft,
  ChevronRightIcon,
  RefreshCwIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Candidate, Remark } from "@/types/candidate";
import type { Job } from "@/types/job";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { useLazyFetchCandidateByIdQuery } from "@/lib/features/candidate/candidateApi";
import { useGetServerLogsQuery } from "@/lib/features/settings/settingsApi";
import { toast } from "@/hooks/use-toast";
import {
  formatDate,
  formatTime,
} from "../../jobs/[id]/hooks/dateTimeFormatting";
import DesktopSkeletonHistroyLogs from "./history-logs-desktop-skeleton";
import MobileSkeletonHistroyLogs from "./history-logs-mobile-skeleton";
import { useRenderLogTitle } from "@/app/dashboard/hooks/useRenderLogTitle";
import { useDebounce } from "@/hooks/useDebounce";

type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
};

type LogEntry = {
  candidateId: string;
  jobId: string;
  candidateData: Candidate;
  jobData: Job;
  dateTime: string;
  assignmentBy: {
    _id: string;
    name: string;
    email: string;
  }[];
  currentInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  remark: Remark;
  previousInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  title: string;
  note: { description: string; date: string; rating: number; userId: string[] };
  attachments: any[];
};

export function ServerHistoryLogs({
  searchQuery,
  setSearchQuery,
  onError,
}: Props) {
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const historyOffset = useMemo(
    () => (historyPage - 1) * historyPageSize,
    [historyPage, historyPageSize]
  );
  const [rawSearch, setRawSearch] = useState(searchQuery);
  const debouncedSearchQuery = useDebounce(rawSearch, 500);

  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const {
    data: historyResp,
    isLoading: historyLoading,
    isFetching: historyFetching,
    refetch,
  } = useGetServerLogsQuery(
    { offset: historyOffset, limit: historyPageSize, query: searchQuery },
    { skip: false }
  );
  const { renderLogTitle } = useRenderLogTitle();
  const historyLogs: LogEntry[] = historyResp?.logs || [];
  const totalHistoryLines = historyResp?.totalLines || 0;
  const historyBusy = historyLoading || historyFetching;

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  const handleCandidateModalDetail = async (key: string) => {
    try {
      const result = await fetchCandidateById(key);
      if (result.data) {
        setSelectedCandidate(result.data);
        return;
      }
      throw new Error("No candidate data returned");
    } catch (err: any) {
      onError?.(null);
      toast({
        title: "Error",
        description: "Failed to load candidate details",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Filter Bar */}
      <div className="mb-4 flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-card/60 border rounded-lg p-3 sm:p-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            aria-label="Search history logs"
            placeholder="Search logs by candidate, job title, email, skills, or remarks..."
            value={rawSearch}
            onChange={(e) => {
              setRawSearch(e.target.value);
              setHistoryPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={refetch}
            disabled={historyFetching}
            variant="secondary"
          >
            <RefreshCwIcon
              className={`h-1 w-1 transition-transform ${
                historyFetching ? "animate-spin" : ""
              }`}
            />
          </Button>
          <span className="text-sm text-muted-foreground">Items per page</span>
          <Select
            value={String(historyPageSize)}
            onValueChange={(v) => {
              setHistoryPageSize(Number.parseInt(v, 10));
              setHistoryPage(1);
            }}
            disabled={historyFetching}
          >
            <SelectTrigger
              className="w-[100px]"
              aria-label="Select items per page"
            >
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Container */}
      <div className="flex-1 overflow-hidden border rounded-lg bg-card/50 shadow-sm">
        <div className="max-h-[75vh] overflow-auto">
          {historyBusy ? (
            <>
              {/* Mobile skeletons */}
              <MobileSkeletonHistroyLogs />
              {/* Desktop skeleton table */}
              <DesktopSkeletonHistroyLogs />
            </>
          ) : historyLogs.length === 0 ? (
            <div className="h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
              No history logs found.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-3">
                {historyLogs.map((log, i) => (
                  <div
                    key={`${log.candidateId}-${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCandidateModalDetail(log.candidateId)}
                    className="rounded-lg border bg-card p-3 shadow-sm hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-pretty">
                          {renderLogTitle(log)}
                        </div>
                        {(log as any).note?.description &&
                          typeof (log as any).note.description === "string" && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {(log as any).note.description}
                            </div>
                          )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="View details"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCandidateModalDetail(log.candidateId);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Candidate
                        </span>
                        <span className="font-medium truncate">
                          {log.candidateData?.name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {log.candidateData?.email || "—"}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Job
                        </span>
                        <span className="font-medium truncate">
                          {log.jobData?.title || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {(log.jobData?.skills || []).slice(0, 3).join(", ") ||
                            "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(log.dateTime)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(log.dateTime)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto px-4">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[220px] text-xs uppercase tracking-wider text-muted-foreground">
                        Title
                      </TableHead>
                      <TableHead className="min-w-[200px] text-xs uppercase tracking-wider text-muted-foreground">
                        Candidate
                      </TableHead>
                      <TableHead className="min-w-[220px] text-xs uppercase tracking-wider text-muted-foreground">
                        Job
                      </TableHead>
                      <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
                        Date
                      </TableHead>
                      <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
                        Updated By
                      </TableHead>
                      <TableHead className="text-right min-w-[100px] text-xs uppercase tracking-wider text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLogs.map((log, i) => (
                      <TableRow
                        onClick={() =>
                          handleCandidateModalDetail(log.candidateId)
                        }
                        key={`${log.candidateId}-${i}`}
                        className="group hover:bg-muted/50 cursor-pointer even:bg-muted/30"
                      >
                        <TableCell className="align-top">
                          <div className="max-w-[420px] space-y-1">
                            <div className="font-medium truncate">
                              {renderLogTitle(log)}
                            </div>
                            {(log as any).note?.description &&
                              typeof (log as any).note.description ===
                                "string" && (
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {(log as any).note.description}
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col">
                            <span className="font-medium truncate">
                              {log.candidateData?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {log.candidateData?.email || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col">
                            <span className="font-medium truncate">
                              {log.jobData?.title || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {(log.jobData?.skills || [])
                                .slice(0, 3)
                                .join(", ") || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(log.dateTime)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(log.dateTime)}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {log?.assignmentBy.length
                                ? log?.assignmentBy[0]?.name
                                : "SELF"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {log?.assignmentBy.length
                                ? log?.assignmentBy[0]?.email
                                : log?.candidateData?.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCandidateModalDetail(log.candidateId);
                            }}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 p-3 border-t bg-card/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
            disabled={historyPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {historyPage} of{" "}
            {Math.max(1, Math.ceil(totalHistoryLines / historyPageSize))}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryPage((p) => p + 1)}
            disabled={historyOffset + historyLogs.length >= totalHistoryLines}
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Candidate Details Dialog */}
      {selectedCandidate && (
        <CandidateDetailsDialog
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onOpenChange={(open: boolean) => {
            if (!open) setSelectedCandidate(null);
          }}
          onUpdate={() => {}}
          hideCloseButtons={false}
        />
      )}
    </div>
  );
}
